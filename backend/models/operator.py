from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class Operator(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    companyName: str
    contactPerson: str
    country: str
    type: str  # "DMC", "operator", "agent"
    email: str
    phone: str
    businessPotential: str  # "high", "medium", "low"
    notes: Optional[str] = ""
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "companyName": "Nexus DMC India",
                "contactPerson": "Raj Kumar",
                "country": "India",
                "type": "DMC",
                "email": "raj@nexusdmc.in",
                "phone": "+91 11 2345 6789",
                "businessPotential": "high",
                "notes": "Top DMC, excellent payment record"
            }
        }

class OperatorCreate(BaseModel):
    companyName: str
    contactPerson: str
    country: str
    type: str
    email: str
    phone: str
    businessPotential: str
    notes: Optional[str] = ""

class OperatorUpdate(BaseModel):
    companyName: Optional[str] = None
    contactPerson: Optional[str] = None
    country: Optional[str] = None
    type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    businessPotential: Optional[str] = None
    notes: Optional[str] = None
