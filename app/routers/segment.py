# app/routers/segment.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import jieba

router = APIRouter(prefix="/api/segment", tags=["segment"])

class TextRequest(BaseModel):
    text: str

class SegmentResponse(BaseModel):
    words: List[str]
    original: str

@router.post("/segment", response_model=SegmentResponse)
async def segment_text(request: TextRequest):
    # Сегментируем китайский текст
    words = list(jieba.cut(request.text))
    return SegmentResponse(words=words, original=request.text)