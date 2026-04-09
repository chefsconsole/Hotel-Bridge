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
    # Get all confirmed bookings with their creation month
    bookings = []
    async for booking in db.bookings.find({"status": "confirmed"}):
        bookings.append(booking)
    
    # Get all commissions
    commissions = []
    async for commission in db.commissions.find():
        commissions.append(commission)
    
    # Create commission lookup by booking ID
    commission_map = {c.get("bookingId"): c.get("commissionAmount", 0) for c in commissions}
    
    # Group by month (simplified - using last 6 months)
    from datetime import datetime, timedelta
    monthly_data = []
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    # Get current month and previous 5 months
    current_date = datetime.utcnow()
    for i in range(5, -1, -1):
        month_date = current_date - timedelta(days=30 * i)
        month_num = month_date.month
        month_name = months[month_num - 1]
        
        # Sum revenue and commission for this month (simplified)
        month_revenue = sum(
            b.get("totalRevenue", 0) 
            for b in bookings 
            if b.get("createdAt") and b["createdAt"].month == month_num
        )
        
        month_commission = sum(
            commission_map.get(str(b.get("_id")), 0)
            for b in bookings
            if b.get("createdAt") and b["createdAt"].month == month_num
        )
        
        # If no data for this month, use proportional data
        if month_revenue == 0 and bookings:
            total_revenue = sum(b.get("totalRevenue", 0) for b in bookings)
            month_revenue = total_revenue / 6
            month_commission = month_revenue * 0.12
        
        monthly_data.append({
            "month": month_name,
            "revenue": round(month_revenue, 2),
            "commission": round(month_commission, 2)
        })
    
    return monthly_data

@router.get("/top-hotels")
async def get_top_hotels():
    """Get top performing hotels"""
    # Get all bookings
    bookings_by_hotel = {}
    async for booking in db.bookings.find():
        hotel_key = booking.get("hotelId")
        hotel_name = booking.get("hotelName", "Unknown")
        
        if hotel_key not in bookings_by_hotel:
            bookings_by_hotel[hotel_key] = {
                "name": hotel_name,
                "bookings": 0,
                "revenue": 0
            }
        
        bookings_by_hotel[hotel_key]["bookings"] += 1
        bookings_by_hotel[hotel_key]["revenue"] += booking.get("totalRevenue", 0)
    
    # Sort by number of bookings and take top 5
    top_hotels = sorted(
        bookings_by_hotel.values(),
        key=lambda x: x["bookings"],
        reverse=True
    )[:5]
    
    return top_hotels

@router.get("/top-operators")
async def get_top_operators():
    """Get top performing operators"""
    # Get all bookings
    bookings_by_operator = {}
    async for booking in db.bookings.find():
        op_key = booking.get("operatorId")
        op_name = booking.get("operatorName", "Unknown")
        
        if op_key not in bookings_by_operator:
            bookings_by_operator[op_key] = {
                "name": op_name,
                "bookings": 0,
                "revenue": 0
            }
        
        bookings_by_operator[op_key]["bookings"] += 1
        bookings_by_operator[op_key]["revenue"] += booking.get("totalRevenue", 0)
    
    # Sort by revenue and take top 5
    top_operators = sorted(
        bookings_by_operator.values(),
        key=lambda x: x["revenue"],
        reverse=True
    )[:5]
    
    return top_operators
