from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

# Import routes
from routes import hotels, operators, bookings, commissions, dashboard, auth, ai_assistant

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="HotelBridge CRM API")

# Create a router with the /api prefix for root endpoint
api_router = APIRouter(prefix="/api")

# Add a simple root endpoint
@api_router.get("/")
async def root():
    return {"message": "HotelBridge CRM API"}

# Include all route modules
app.include_router(hotels.router)
app.include_router(operators.router)
app.include_router(bookings.router)
app.include_router(commissions.router)
app.include_router(dashboard.router)
app.include_router(auth.router)
app.include_router(ai_assistant.router)

# Include the api_router for root endpoint
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

logger.info("HotelBridge CRM API started successfully")
