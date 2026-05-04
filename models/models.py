from sqlalchemy import Column, Integer, String, Text
from database import Base


class Dictionary(Base):
    __tablename__ = "dictionary"

    id = Column(Integer, primary_key=True, index=True)
    word = Column(String, index=True, nullable=False)
    pinyin = Column(String)
    translation = Column(Text)
    examples = Column(Text)
