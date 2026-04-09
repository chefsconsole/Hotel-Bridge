from fastapi import APIRouter, HTTPException
from database import db
from models.operator import Operator, OperatorCreate, OperatorUpdate
from bson import ObjectId
from typing import List
from datetime import datetime

router = APIRouter(prefix="/api/operators", tags=["operators"])

def operator_helper(operator) -> dict:
    return {
        "id": str(operator["_id"]),
        "companyName": operator["companyName"],
        "contactPerson": operator["contactPerson"],
        "country": operator["country"],
        "type": operator["type"],
        "email": operator["email"],
        "phone": operator["phone"],
        "businessPotential": operator["businessPotential"],
        "notes": operator.get("notes", ""),
        "createdAt": operator.get("createdAt"),
        "updatedAt": operator.get("updatedAt")
    }

@router.get("/", response_model=List[dict])
async def get_all_operators():
    """Get all operators"""
    operators = []
    async for operator in db.operators.find():
        operators.append(operator_helper(operator))
    return operators

@router.get("/{operator_id}")
async def get_operator(operator_id: str):
    """Get a specific operator by ID"""
    if not ObjectId.is_valid(operator_id):
        raise HTTPException(status_code=400, detail="Invalid operator ID")
    
    operator = await db.operators.find_one({"_id": ObjectId(operator_id)})
    if operator:
        return operator_helper(operator)
    raise HTTPException(status_code=404, detail="Operator not found")

@router.post("/", status_code=201)
async def create_operator(operator: OperatorCreate):
    """Create a new operator"""
    operator_dict = operator.dict()
    operator_dict["createdAt"] = datetime.utcnow()
    operator_dict["updatedAt"] = datetime.utcnow()
    
    result = await db.operators.insert_one(operator_dict)
    new_operator = await db.operators.find_one({"_id": result.inserted_id})
    return operator_helper(new_operator)

@router.put("/{operator_id}")
async def update_operator(operator_id: str, operator_update: OperatorUpdate):
    """Update an operator"""
    if not ObjectId.is_valid(operator_id):
        raise HTTPException(status_code=400, detail="Invalid operator ID")
    
    update_data = {k: v for k, v in operator_update.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updatedAt"] = datetime.utcnow()
    
    result = await db.operators.update_one(
        {"_id": ObjectId(operator_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Operator not found")
    
    updated_operator = await db.operators.find_one({"_id": ObjectId(operator_id)})
    return operator_helper(updated_operator)

@router.delete("/{operator_id}")
async def delete_operator(operator_id: str):
    """Delete an operator"""
    if not ObjectId.is_valid(operator_id):
        raise HTTPException(status_code=400, detail="Invalid operator ID")
    
    result = await db.operators.delete_one({"_id": ObjectId(operator_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Operator not found")
    
    return {"message": "Operator deleted successfully"}
