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
    
    result = await db.bookings.update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": update_data}
    )
    
    updated_booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
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
