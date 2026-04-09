from pydantic import BaseModel
from typing import Optional

class User(BaseModel):
    email: str
    password: str  # In production, this should be hashed
    role: str = "admin"

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    email: str
