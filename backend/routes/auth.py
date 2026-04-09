from fastapi import APIRouter, HTTPException
from database import db
from models.user import UserLogin, Token

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login")
async def login(user: UserLogin):
    """Login endpoint - simplified for demo"""
    # In production, use proper password hashing (bcrypt)
    if user.email == "admin@hotelbridge.com" and user.password == "admin123":
        return {
            "access_token": "demo_token_123",
            "token_type": "bearer",
            "email": user.email
        }
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@router.post("/logout")
async def logout():
    """Logout endpoint"""
    return {"message": "Logged out successfully"}
