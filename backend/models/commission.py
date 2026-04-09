from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class Commission(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    bookingId: str
    groupName: str
    totalBookingValue: float
    marginPerRoom: float
    totalMargin: float
    commissionPercent: float
    commissionAmount: float
    paymentStatus: str = "pending"  # "pending", "received"
    paymentDueDate: str
    paidDate: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class CommissionCreate(BaseModel):
    bookingId: str
    groupName: str
    totalBookingValue: float
    marginPerRoom: float
    totalMargin: float
    commissionPercent: float
    commissionAmount: float
    paymentStatus: str = "pending"
    paymentDueDate: str
    paidDate: Optional[str] = None

class CommissionUpdate(BaseModel):
    paymentStatus: Optional[str] = None
    paidDate: Optional[str] = None
    marginPerRoom: Optional[float] = None
    totalMargin: Optional[float] = None
    commissionPercent: Optional[float] = None
    commissionAmount: Optional[float] = None
