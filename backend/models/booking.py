from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date

class Booking(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    groupName: str
    operatorId: str
    operatorName: str
    destination: str
    hotelId: str
    hotelName: str
    checkIn: str  # ISO date string
    checkOut: str  # ISO date string
    nights: int
    rooms: int
    ratePerRoom: float
    totalRevenue: float  # Auto-calculated
    status: str = "inquiry"  # "inquiry", "quoted", "confirmed", "cancelled"
    notes: Optional[str] = ""
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "groupName": "Mumbai Corporate Incentive",
                "operatorId": "123",
                "operatorName": "Nexus DMC India",
                "destination": "Rome",
                "hotelId": "456",
                "hotelName": "Grand Hotel Europa",
                "checkIn": "2025-03-15",
                "checkOut": "2025-03-18",
                "nights": 3,
                "rooms": 40,
                "ratePerRoom": 150,
                "totalRevenue": 18000,
                "status": "confirmed",
                "notes": "Corporate incentive group"
            }
        }

class BookingCreate(BaseModel):
    groupName: str
    operatorId: str
    operatorName: str
    destination: str
    hotelId: str
    hotelName: str
    checkIn: str
    checkOut: str
    nights: int
    rooms: int
    ratePerRoom: float
    status: str = "inquiry"
    notes: Optional[str] = ""

class BookingUpdate(BaseModel):
    groupName: Optional[str] = None
    operatorId: Optional[str] = None
    operatorName: Optional[str] = None
    destination: Optional[str] = None
    hotelId: Optional[str] = None
    hotelName: Optional[str] = None
    checkIn: Optional[str] = None
    checkOut: Optional[str] = None
    nights: Optional[int] = None
    rooms: Optional[int] = None
    ratePerRoom: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
