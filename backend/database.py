from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from the correct path
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

# MongoDB connection - shared across all routes
mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.getenv('DB_NAME', 'test_database')

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]
