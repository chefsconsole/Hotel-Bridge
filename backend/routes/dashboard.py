from fastapi import APIRouter, HTTPException
from database import db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats")
async def get_dashboard_stats():
    """Get dashboard statistics"""
    
    # Get confirmed bookings
    confirmed_bookings = []
    async for booking in db.bookings.find({"status": "confirmed"}):
        confirmed_bookings.append(booking)
    
    # Calculate stats
    total_revenue = sum(b.get("totalRevenue", 0) for b in confirmed_bookings)
    total_room_nights = sum(b.get("rooms", 0) * b.get("nights", 0) for b in confirmed_bookings)
    
    # Get commission data
    commissions = []
    async for commission in db.commissions.find():
        commissions.append(commission)
    
    total_commission = sum(c.get("commissionAmount", 0) for c in commissions)
    pending_payments = sum(
        c.get("commissionAmount", 0) 
        for c in commissions 
        if c.get("paymentStatus") == "pending"
    )
    
    # Get hotel and operator counts
    total_hotels = await db.hotels.count_documents({"status": "active"})
    total_operators = await db.operators.count_documents({})
    
    return {
        "totalRevenue": total_revenue,
        "totalRoomNights": total_room_nights,
        "totalCommission": total_commission,
        "pendingPayments": pending_payments,
        "confirmedBookings": len(confirmed_bookings),
        "totalHotels": total_hotels,
        "totalOperators": total_operators
    }

@router.get("/monthly-revenue")
async def get_monthly_revenue():
    """Get monthly revenue data for charts"""
    # This is simplified - in production, you'd aggregate by actual dates
    pipeline = [
        {
            "$match": {"status": "confirmed"}
        },
        {
            "$group": {
                "_id": {"$month": "$createdAt"},
                "revenue": {"$sum": "$totalRevenue"}
            }
        },
        {
            "$sort": {"_id": 1}
        }
    ]
    
    monthly_data = []
    async for item in db.bookings.aggregate(pipeline):
        monthly_data.append({
            "month": item["_id"],
            "revenue": item["revenue"],
            "commission": item["revenue"] * 0.12  # Average commission
        })
    
    return monthly_data

@router.get("/top-hotels")
async def get_top_hotels():
    """Get top performing hotels"""
    pipeline = [
        {
            "$group": {
                "_id": {
                    "hotelId": "$hotelId",
                    "hotelName": "$hotelName"
                },
                "bookings": {"$sum": 1},
                "revenue": {"$sum": "$totalRevenue"}
            }
        },
        {
            "$sort": {"bookings": -1}
        },
        {
            "$limit": 5
        }
    ]
    
    top_hotels = []
    async for hotel in db.bookings.aggregate(pipeline):
        top_hotels.append({
            "name": hotel["_id"]["hotelName"],
            "bookings": hotel["bookings"],
            "revenue": hotel["revenue"]
        })
    
    return top_hotels

@router.get("/top-operators")
async def get_top_operators():
    """Get top performing operators"""
    pipeline = [
        {
            "$group": {
                "_id": {
                    "operatorId": "$operatorId",
                    "operatorName": "$operatorName"
                },
                "bookings": {"$sum": 1},
                "revenue": {"$sum": "$totalRevenue"}
            }
        },
        {
            "$sort": {"revenue": -1}
        },
        {
            "$limit": 5
        }
    ]
    
    top_operators = []
    async for operator in db.bookings.aggregate(pipeline):
        top_operators.append({
            "name": operator["_id"]["operatorName"],
            "bookings": operator["bookings"],
            "revenue": operator["revenue"]
        })
    
    return top_operators
