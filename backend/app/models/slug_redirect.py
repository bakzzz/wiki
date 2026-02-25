from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.base import Base

class SlugRedirect(Base):
    __tablename__ = "slug_redirects"

    id = Column(Integer, primary_key=True, index=True)
    old_slug = Column(String, unique=True, index=True, nullable=False)
    new_slug = Column(String, nullable=False)
    page_id = Column(Integer, ForeignKey("pages.id"), nullable=False)
