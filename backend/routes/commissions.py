from fastapi import APIRouter, HTTPException
from database import db
from models.commission import Commission, CommissionCreate, CommissionUpdate
from bson import ObjectId
from typing import List
from datetime import datetime

router = APIRouter(prefix="/api/commissions", tags=["commissions"])

def commission_helper(commission) -> dict:
    return {
        "id": str(commission["_id"]),
        "bookingId": commission["bookingId"],
        "groupName": commission["groupName"],
        "totalBookingValue": commission["totalBookingValue"],
        "marginPerRoom": commission["marginPerRoom"],
        "totalMargin": commission["totalMargin"],
        "commissionPercent": commission["commissionPercent"],
        "commissionAmount": commission["commissionAmount"],
        "paymentStatus": commission["paymentStatus"],
        "paymentDueDate": commission["paymentDueDate"],
        "paidDate": commission.get("paidDate"),
        "createdAt": commission.get("createdAt"),
        "updatedAt": commission.get("updatedAt")
    }

@router.get("/", response_model=List[dict])
async def get_all_commissions():
    """Get all commissions"""
    commissions = []
    async for commission in db.commissions.find():
        commissions.append(commission_helper(commission))
    return commissions

@router.get("/{commission_id}")
async def get_commission(commission_id: str):
    """Get a specific commission by ID"""
    if not ObjectId.is_valid(commission_id):
        raise HTTPException(status_code=400, detail="Invalid commission ID")
    
    commission = await db.commissions.find_one({"_id": ObjectId(commission_id)})
    if commission:
        return commission_helper(commission)
    raise HTTPException(status_code=404, detail="Commission not found")

@router.get("/booking/{booking_id}")
async def get_commission_by_booking(booking_id: str):
    """Get commission for a specific booking"""
    commission = await db.commissions.find_one({"bookingId": booking_id})
    if commission:
        return commission_helper(commission)
    raise HTTPException(status_code=404, detail="Commission not found for this booking")

@router.post("/", status_code=201)
async def create_commission(commission: CommissionCreate):
    """Create a new commission record"""
    commission_dict = commission.dict()
    commission_dict["createdAt"] = datetime.utcnow()
    commission_dict["updatedAt"] = datetime.utcnow()
    
    result = await db.commissions.insert_one(commission_dict)
    new_commission = await db.commissions.find_one({"_id": result.inserted_id})
    return commission_helper(new_commission)

@router.put("/{commission_id}")
async def update_commission(commission_id: str, commission_update: CommissionUpdate):
    """Update a commission (mainly for payment status)"""
    if not ObjectId.is_valid(commission_id):
        raise HTTPException(status_code=400, detail="Invalid commission ID")
    
    update_data = {k: v for k, v in commission_update.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updatedAt"] = datetime.utcnow()
    
    result = await db.commissions.update_one(
        {"_id": ObjectId(commission_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Commission not found")
    
    updated_commission = await db.commissions.find_one({"_id": ObjectId(commission_id)})
    return commission_helper(updated_commission)

@router.delete("/{commission_id}")
async def delete_commission(commission_id: str):
    """Delete a commission"""
    if not ObjectId.is_valid(commission_id):
        raise HTTPException(status_code=400, detail="Invalid commission ID")
    
    result = await db.commissions.delete_one({"_id": ObjectId(commission_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Commission not found")
    
    return {"message": "Commission deleted successfully"}
