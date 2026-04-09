from fastapi import APIRouter, HTTPException
from database import db
from models.hotel import Hotel, HotelCreate, HotelUpdate
from bson import ObjectId
from typing import List
from datetime import datetime

router = APIRouter(prefix="/api/hotels", tags=["hotels"])

def hotel_helper(hotel) -> dict:
    return {
        "id": str(hotel["_id"]),
        "name": hotel["name"],
        "city": hotel["city"],
        "country": hotel["country"],
        "contactPerson": hotel["contactPerson"],
        "email": hotel["email"],
        "phone": hotel["phone"],
        "rooms": hotel["rooms"],
        "starCategory": hotel["starCategory"],
        "contractType": hotel["contractType"],
        "commission": hotel["commission"],
        "ratesLow": hotel["ratesLow"],
        "ratesMid": hotel["ratesMid"],
        "ratesHigh": hotel["ratesHigh"],
        "blackoutDates": hotel.get("blackoutDates", []),
        "status": hotel["status"],
        "notes": hotel.get("notes", ""),
        "createdAt": hotel.get("createdAt"),
        "updatedAt": hotel.get("updatedAt")
    }

@router.get("/", response_model=List[dict])
async def get_all_hotels():
    """Get all hotels"""
    hotels = []
    async for hotel in db.hotels.find():
        hotels.append(hotel_helper(hotel))
    return hotels

@router.get("/{hotel_id}")
async def get_hotel(hotel_id: str):
    """Get a specific hotel by ID"""
    if not ObjectId.is_valid(hotel_id):
        raise HTTPException(status_code=400, detail="Invalid hotel ID")
    
    hotel = await db.hotels.find_one({"_id": ObjectId(hotel_id)})
    if hotel:
        return hotel_helper(hotel)
    raise HTTPException(status_code=404, detail="Hotel not found")

@router.post("/", status_code=201)
async def create_hotel(hotel: HotelCreate):
    """Create a new hotel"""
    hotel_dict = hotel.dict()
    hotel_dict["createdAt"] = datetime.utcnow()
    hotel_dict["updatedAt"] = datetime.utcnow()
    
    result = await db.hotels.insert_one(hotel_dict)
    new_hotel = await db.hotels.find_one({"_id": result.inserted_id})
    return hotel_helper(new_hotel)

@router.put("/{hotel_id}")
async def update_hotel(hotel_id: str, hotel_update: HotelUpdate):
    """Update a hotel"""
    if not ObjectId.is_valid(hotel_id):
        raise HTTPException(status_code=400, detail="Invalid hotel ID")
    
    update_data = {k: v for k, v in hotel_update.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updatedAt"] = datetime.utcnow()
    
    result = await db.hotels.update_one(
        {"_id": ObjectId(hotel_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    updated_hotel = await db.hotels.find_one({"_id": ObjectId(hotel_id)})
    return hotel_helper(updated_hotel)

@router.delete("/{hotel_id}")
async def delete_hotel(hotel_id: str):
    """Delete a hotel"""
    if not ObjectId.is_valid(hotel_id):
        raise HTTPException(status_code=400, detail="Invalid hotel ID")
    
    result = await db.hotels.delete_one({"_id": ObjectId(hotel_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    return {"message": "Hotel deleted successfully"}
