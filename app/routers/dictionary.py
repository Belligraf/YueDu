from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import Dictionary
from pydantic import BaseModel

router = APIRouter(prefix="/api/dictionary", tags=["dictionary"])


class DictionaryBase(BaseModel):
    word: str
    pinyin: Optional[str] = None
    translation: str
    examples: Optional[str] = None


class DictionaryOut(DictionaryBase):
    id: int

    class Config:
        from_attributes = True


@router.get("/search/{query}", response_model=List[DictionaryOut])
def search_in_dictionary(query: str, db: Session = Depends(get_db)):
    words = db.query(Dictionary).filter(
        or_(
            Dictionary.word.contains(query),
            Dictionary.translation.contains(query)
        )
    ).limit(50).all()
    return words


@router.get("/translate/{word}")
def translate_word(word: str, db: Session = Depends(get_db)):
    dict_entry = db.query(Dictionary).filter(Dictionary.word == word).first()

    if dict_entry:
        return {
            "word": word,
            "translation": dict_entry.translation,
            "pinyin": dict_entry.pinyin,
            "examples": dict_entry.examples
        }

    return {
        "word": word,
        "translation": None,
        "pinyin": None,
        "examples": None
    }


@router.post("/add", response_model=DictionaryOut)
def add_to_dictionary(word: DictionaryBase, db: Session = Depends(get_db)):
    existing = db.query(Dictionary).filter(Dictionary.word == word.word).first()
    if existing:
        raise HTTPException(status_code=400, detail="Word already exists")

    db_word = Dictionary(**word.model_dump())
    db.add(db_word)
    db.commit()
    db.refresh(db_word)
    return db_word