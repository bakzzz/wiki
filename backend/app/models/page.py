from sqlalchemy import Column, Integer, String, Text
from sqlalchemy_utils import LtreeType
from app.db.base import Base

class Page(Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    content = Column(Text, nullable=True)  # Will store JSON from Tiptap editor
    path = Column(LtreeType, nullable=False, index=True)
