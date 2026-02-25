from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
import re


class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not re.match(r'^[^@]+@[^@]+\.[^@]+$', v):
            raise ValueError('Invalid email format')
        return v.lower().strip()


class UserCreate(BaseModel):
    email: str
    password: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not re.match(r'^[^@]+@[^@]+\.[^@]+$', v):
            raise ValueError('Invalid email format')
        return v.lower().strip()


class Token(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    id: int
    email: str
    is_active: bool
    is_superuser: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserWithRole(UserResponse):
    role: Optional[str] = None


class RoleAssign(BaseModel):
    user_id: int
    role: str


class RoomCreate(BaseModel):
    name: str
    display_name: str


class RoomResponse(BaseModel):
    name: str
    display_name: str
