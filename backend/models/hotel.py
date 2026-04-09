from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class Hotel(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    city: str
    country: str
    contactPerson: str
    email: str
    phone: str
    rooms: int
    starCategory: int = Field(ge=1, le=5)
    contractType: str  # "commission" or "net"
    commission: float
    ratesLow: float
    ratesMid: float
    ratesHigh: float
    blackoutDates: List[str] = []
    status: str = "active"  # "active" or "inactive"
    notes: Optional[str] = ""
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "name": "Grand Hotel Europa",
                "city": "Rome",
                "country": "Italy",
                "contactPerson": "Marco Rossi",
                "email": "marco@grandeuropa.com",
                "phone": "+39 06 1234 5678",
                "rooms": 120,
                "starCategory": 4,
                "contractType": "commission",
                "commission": 12,
                "ratesLow": 80,
                "ratesMid": 120,
                "ratesHigh": 180,
                "blackoutDates": [],
                "status": "active",
                "notes": "Excellent property"
            }
        }

class HotelCreate(BaseModel):
    name: str
    city: str
    country: str
    contactPerson: str
    email: str
    phone: str
    rooms: int
    starCategory: int = Field(ge=1, le=5)
    contractType: str
    commission: float
    ratesLow: float
    ratesMid: float
    ratesHigh: float
    blackoutDates: List[str] = []
    status: str = "active"
    notes: Optional[str] = ""

class HotelUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    contactPerson: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    rooms: Optional[int] = None
    starCategory: Optional[int] = None
    contractType: Optional[str] = None
    commission: Optional[float] = None
    ratesLow: Optional[float] = None
    ratesMid: Optional[float] = None
    ratesHigh: Optional[float] = None
    blackoutDates: Optional[List[str]] = None
    status: Optional[str] = None
    notes: Optional[str] = None
