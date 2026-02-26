from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy_utils import LtreeType
from app.db.base import Base


class Page(Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    content = Column(Text, nullable=True)
    path = Column(LtreeType, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)


class PageVersion(Base):
    __tablename__ = "page_versions"

    id = Column(Integer, primary_key=True, index=True)
    page_id = Column(Integer, nullable=False, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    edited_by = Column(String, nullable=True)
    edited_at = Column(DateTime(timezone=True), server_default=func.now())
