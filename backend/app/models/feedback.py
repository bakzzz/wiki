"""Feedback model — stores public feedback messages for rooms."""
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func

from app.db.base import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    room_name = Column(String(100), nullable=False, index=True)
    text = Column(Text, nullable=False)
    author_name = Column(String(200), nullable=False, default="")
    author_org = Column(String(200), nullable=False, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
