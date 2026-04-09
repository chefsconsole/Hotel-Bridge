from fastapi import APIRouter, HTTPException
from database import db
from models.booking import Booking, BookingCreate, BookingUpdate
from bson import ObjectId
from typing import List
from datetime import datetime

router = APIRouter(prefix="/api/bookings", tags=["bookings"])

def booking_helper(booking) -> dict:
    return {
        "id": str(booking["_id"]),
        "groupName": booking["groupName"],
        "operatorId": booking["operatorId"],
        "operatorName": booking["operatorName"],
        "destination": booking["destination"],
        "hotelId": booking["hotelId"],
        "hotelName": booking["hotelName"],
        "checkIn": booking["checkIn"],
        "checkOut": booking["checkOut"],
        "nights": booking["nights"],
        "rooms": booking["rooms"],
        "ratePerRoom": booking["ratePerRoom"],
        "totalRevenue": booking["totalRevenue"],
        "status": booking["status"],
        "notes": booking.get("notes", ""),
        "createdAt": booking.get("createdAt"),
        "updatedAt": booking.get("updatedAt")
    }

def calculate_total_revenue(rooms: int, nights: int, rate_per_room: float) -> float:
    """Calculate total revenue for booking"""
    return rooms * nights * rate_per_room

@router.get("/", response_model=List[dict])
async def get_all_bookings():
    """Get all bookings"""
    bookings = []
    async for booking in db.bookings.find():
        bookings.append(booking_helper(booking))
    return bookings

@router.get("/{booking_id}")
async def get_booking(booking_id: str):
    """Get a specific booking by ID"""
    if not ObjectId.is_valid(booking_id):
        raise HTTPException(status_code=400, detail="Invalid booking ID")
    
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if booking:
        return booking_helper(booking)
    raise HTTPException(status_code=404, detail="Booking not found")

@router.post("/", status_code=201)
async def create_booking(booking: BookingCreate):
    """Create a new booking"""
    booking_dict = booking.dict()
    
    # Calculate total revenue
    total_revenue = calculate_total_revenue(
        booking_dict["rooms"],
        booking_dict["nights"],
        booking_dict["ratePerRoom"]
    )
    booking_dict["totalRevenue"] = total_revenue
    booking_dict["createdAt"] = datetime.utcnow()
    booking_dict["updatedAt"] = datetime.utcnow()
    
    result = await db.bookings.insert_one(booking_dict)
    new_booking = await db.bookings.find_one({"_id": result.inserted_id})
    
    # Auto-create commission record if booking is confirmed
    if booking_dict.get("status") == "confirmed":
        # Get hotel commission rate
        hotel = await db.hotels.find_one({"_id": ObjectId(booking_dict["hotelId"])})
        commission_percent = hotel.get("commission", 10) if hotel else 10
        
        # Calculate commission (assuming margin is 20% of rate)
        margin_per_room = booking_dict["ratePerRoom"] * 0.20
        total_margin = margin_per_room * booking_dict["rooms"] * booking_dict["nights"]
        commission_amount = total_revenue * (commission_percent / 100)
        
        # Calculate due date (30 days after checkout)
        from datetime import datetime as dt, timedelta
        checkout_date = dt.fromisoformat(booking_dict["checkOut"])
        due_date = (checkout_date + timedelta(days=30)).isoformat()[:10]
        
        commission_data = {
            "bookingId": str(result.inserted_id),
            "groupName": booking_dict["groupName"],
            "totalBookingValue": total_revenue,
            "marginPerRoom": margin_per_room,
            "totalMargin": total_margin,
            "commissionPercent": commission_percent,
            "commissionAmount": commission_amount,
            "paymentStatus": "pending",
            "paymentDueDate": due_date,
            "paidDate": None,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        await db.commissions.insert_one(commission_data)
    
    return booking_helper(new_booking)

@router.put("/{booking_id}")
async def update_booking(booking_id: str, booking_update: BookingUpdate):
    """Update a booking"""
    if not ObjectId.is_valid(booking_id):
        raise HTTPException(status_code=400, detail="Invalid booking ID")
    
    update_data = {k: v for k, v in booking_update.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Get current booking to recalculate revenue if needed
    current_booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not current_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Recalculate total revenue if relevant fields changed
    rooms = update_data.get("rooms", current_booking["rooms"])
    nights = update_data.get("nights", current_booking["nights"])
    rate_per_room = update_data.get("ratePerRoom", current_booking["ratePerRoom"])
    
    update_data["totalRevenue"] = calculate_total_revenue(rooms, nights, rate_per_room)
    update_data["updatedAt"] = datetime.utcnow()
    
    # Update booking
    result = await db.bookings.update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": update_data}
    )
    
    updated_booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    
    # Update or create commission if status is confirmed
    if updated_booking.get("status") == "confirmed":
        hotel = await db.hotels.find_one({"_id": ObjectId(updated_booking["hotelId"])})
        commission_percent = hotel.get("commission", 10) if hotel else 10
        
        margin_per_room = updated_booking["ratePerRoom"] * 0.20
        total_margin = margin_per_room * updated_booking["rooms"] * updated_booking["nights"]
        commission_amount = updated_booking["totalRevenue"] * (commission_percent / 100)
        
        from datetime import datetime as dt, timedelta
        checkout_date = dt.fromisoformat(updated_booking["checkOut"])
        due_date = (checkout_date + timedelta(days=30)).isoformat()[:10]
        
        # Check if commission exists
        existing_commission = await db.commissions.find_one({"bookingId": booking_id})
        
        if existing_commission:
            # Update existing commission
            await db.commissions.update_one(
                {"bookingId": booking_id},
                {"$set": {
                    "groupName": updated_booking["groupName"],
                    "totalBookingValue": updated_booking["totalRevenue"],
                    "marginPerRoom": margin_per_room,
                    "totalMargin": total_margin,
                    "commissionPercent": commission_percent,
                    "commissionAmount": commission_amount,
                    "paymentDueDate": due_date,
                    "updatedAt": datetime.utcnow()
                }}
            )
        else:
            # Create new commission
            commission_data = {
                "bookingId": booking_id,
                "groupName": updated_booking["groupName"],
                "totalBookingValue": updated_booking["totalRevenue"],
                "marginPerRoom": margin_per_room,
                "totalMargin": total_margin,
                "commissionPercent": commission_percent,
                "commissionAmount": commission_amount,
                "paymentStatus": "pending",
                "paymentDueDate": due_date,
                "paidDate": None,
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
            await db.commissions.insert_one(commission_data)
    
    return booking_helper(updated_booking)

@router.delete("/{booking_id}")
async def delete_booking(booking_id: str):
    """Delete a booking"""
    if not ObjectId.is_valid(booking_id):
        raise HTTPException(status_code=400, detail="Invalid booking ID")
    
    result = await db.bookings.delete_one({"_id": ObjectId(booking_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"message": "Booking deleted successfully"}
