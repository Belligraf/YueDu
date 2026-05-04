from pydantic import BaseModel
from typing import List, Optional

class TextCreate(BaseModel):
    title: str
    content: str
    translation: str

class TextOut(TextCreate):
    id: int
    class Config:
        from_attributes = True

