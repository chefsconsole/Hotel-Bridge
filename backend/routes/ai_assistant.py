from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from emergentintegrations.llm.chat import LlmChat, UserMessage
from database import db

router = APIRouter(prefix="/api/ai", tags=["ai-assistant"])

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = "default-session"

class ChatResponse(BaseModel):
    response: str
    timestamp: str

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(chat_message: ChatMessage):
    """
    AI Assistant endpoint that can query CRM data and provide intelligent responses
    """
    try:
        # Get CRM data for context
        hotels_count = await db.hotels.count_documents({"status": "active"})
        operators_count = await db.operators.count_documents({})
        bookings = await db.bookings.find({}, {"_id": 0}).to_list(1000)
        commissions = await db.commissions.find({}, {"_id": 0}).to_list(1000)
        
        # Calculate key metrics
        total_revenue = sum(
            booking.get("rooms", 0) * booking.get("nights", 0) * booking.get("ratePerNight", 0)
            for booking in bookings
        )
        
        confirmed_bookings = [b for b in bookings if b.get("status") == "confirmed"]
        total_commission = sum(c.get("amount", 0) for c in commissions)
        pending_commission = sum(
            c.get("amount", 0) 
            for c in commissions 
            if c.get("paymentStatus") == "pending"
        )
        
        # Build system message with CRM context
        system_message = f"""You are HotelBridge AI Assistant, an intelligent chatbot that helps manage hotel sales representation business.

Current CRM Data Summary:
- Active Hotels: {hotels_count}
- Tour Operators: {operators_count}
- Total Bookings: {len(bookings)}
- Confirmed Bookings: {len(confirmed_bookings)}
- Total Revenue: €{total_revenue:,.2f}
- Total Commissions: €{total_commission:,.2f}
- Pending Commissions: €{pending_commission:,.2f}

You have access to complete booking data, hotel information, operator details, and commission records.

When users ask about:
- Business metrics: Provide accurate data from the summary above
- Specific bookings: Reference the booking data
- Hotel performance: Analyze hotels with most bookings
- Commission status: Report on pending/paid commissions
- Creating bookings: Guide them through the process

Always be helpful, professional, and provide accurate data-driven insights. Format responses clearly with bullet points or sections when appropriate."""

        # Initialize LLM Chat
        api_key = os.getenv("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="LLM API key not configured")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=chat_message.session_id,
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        # Create user message
        user_message = UserMessage(text=chat_message.message)
        
        # Get AI response
        ai_response = await chat.send_message(user_message)
        
        return ChatResponse(
            response=ai_response,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Assistant error: {str(e)}")

@router.get("/context")
async def get_crm_context():
    """
    Get current CRM context for AI assistant
    """
    try:
        hotels = await db.hotels.find({"status": "active"}, {"_id": 0, "name": 1, "city": 1, "country": 1}).to_list(100)
        operators = await db.operators.find({}, {"_id": 0, "name": 1, "country": 1, "type": 1}).to_list(100)
        bookings = await db.bookings.find({}, {"_id": 0}).to_list(100)
        commissions = await db.commissions.find({}, {"_id": 0}).to_list(100)
        
        return {
            "hotels": hotels,
            "operators": operators,
            "bookings": bookings,
            "commissions": commissions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
