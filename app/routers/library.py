from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import UserText, Word, Translation, word_translation_association

router = APIRouter(prefix="/api/library", tags=["library"])


class TextCreate(BaseModel):
    title: str
    content: str
    translation: str


class TextOut(TextCreate):
    id: int

    class Config:
        from_attributes = True


class TextUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    translation: Optional[str] = None


class WordMatch(BaseModel):
    word_id: int
    translation_ids: List[int]


class MatchData(BaseModel):
    text_id: int
    words: List[dict]  # [{word: "你好", position: 0, translation_ids: [0,1]}]
    translations: List[dict]  # [{phrase: "Здравствуйте", position: 0}]
    associations: List[dict]  # [{word_id: 0, translation_ids: [0,1]}]


@router.post("/", response_model=TextOut)
def save_text(text: TextCreate, db: Session = Depends(get_db)):
    db_text = UserText(**text.dict())
    db.add(db_text)
    db.commit()
    db.refresh(db_text)
    return db_text


@router.get("/", response_model=List[TextOut])
def get_library(db: Session = Depends(get_db)):
    return db.query(UserText).all()


@router.get("/{text_id}", response_model=TextOut)
def get_text_by_id(text_id: int, db: Session = Depends(get_db)):
    text = db.query(UserText).filter(UserText.id == text_id).first()
    if not text:
        raise HTTPException(status_code=404, detail="Text not found")
    return text


@router.put("/{text_id}", response_model=TextOut)
def update_text(text_id: int, text_update: TextUpdate, db: Session = Depends(get_db)):
    text = db.query(UserText).filter(UserText.id == text_id).first()
    if not text:
        raise HTTPException(status_code=404, detail="Text not found")

    if text_update.title is not None:
        text.title = text_update.title
    if text_update.content is not None:
        text.content = text_update.content
    if text_update.translation is not None:
        text.translation = text_update.translation

    db.commit()
    db.refresh(text)
    return text


@router.delete("/{text_id}")
def delete_text(text_id: int, db: Session = Depends(get_db)):
    text = db.query(UserText).filter(UserText.id == text_id).first()
    if not text:
        raise HTTPException(status_code=404, detail="Text not found")

    db.delete(text)
    db.commit()
    return {"message": "Text deleted successfully"}


# НОВЫЕ ЭНДПОИНТЫ ДЛЯ СОПОСТАВЛЕНИЙ

@router.get("/{text_id}/matches")
def get_matches(text_id: int, db: Session = Depends(get_db)):
    """Получить все сопоставления для текста"""
    words = db.query(Word).filter(Word.text_id == text_id).all()
    translations = db.query(Translation).filter(Translation.text_id == text_id).all()

    result = {
        "words": [
            {"id": w.id, "word": w.word, "position": w.position,
             "translation_ids": [t.id for t in w.translations]}
            for w in words
        ],
        "translations": [
            {"id": t.id, "phrase": t.phrase, "position": t.position}
            for t in translations
        ]
    }
    return result


@router.post("/{text_id}/matches")
def save_matches(text_id: int, match_data: MatchData, db: Session = Depends(get_db)):
    """Сохранить сопоставления для текста"""

    # Удаляем старые связи
    old_words = db.query(Word).filter(Word.text_id == text_id).all()
    for word in old_words:
        word.translations = []
    db.query(Word).filter(Word.text_id == text_id).delete()
    db.query(Translation).filter(Translation.text_id == text_id).delete()
    db.commit()

    # Создаем новые слова
    words_dict = {}
    for w in match_data.words:
        word = Word(
            text_id=text_id,
            word=w["word"],
            position=w["position"]
        )
        db.add(word)
        db.flush()
        words_dict[w["position"]] = word

    # Создаем новые переводы
    translations_dict = {}
    for t in match_data.translations:
        translation = Translation(
            text_id=text_id,
            phrase=t["phrase"],
            position=t["position"]
        )
        db.add(translation)
        db.flush()
        translations_dict[t["position"]] = translation

    # Создаем связи многие ко многим
    for assoc in match_data.associations:
        word = words_dict.get(assoc["word_id"])
        if word:
            translation_ids = assoc["translation_ids"]
            for trans_id in translation_ids:
                translation = translations_dict.get(trans_id)
                if translation:
                    word.translations.append(translation)

    db.commit()
    return {"message": f"Saved {len(match_data.associations)} associations"}


@router.get("/{text_id}/translate_word/{word}")
def translate_word_in_text(text_id: int, word: str, db: Session = Depends(get_db)):
    """Перевод слова с учетом сопоставлений в тексте"""

    # Ищем слово в сопоставлениях этого текста
    db_word = db.query(Word).filter(
        Word.text_id == text_id,
        Word.word == word
    ).first()

    if db_word and db_word.translations:
        translations = [t.phrase for t in db_word.translations]
        return {
            "word": word,
            "translations": translations,
            "pinyin": "",
            "from_matches": True
        }

    # Если нет, ищем в общем словаре
    from app.models import Dictionary
    dict_entry = db.query(Dictionary).filter(Dictionary.word == word).first()
    if dict_entry:
        return {
            "word": word,
            "translations": [dict_entry.translation],
            "pinyin": dict_entry.pinyin or "",
            "from_matches": False
        }

    return {
        "word": word,
        "translations": [],
        "pinyin": "",
        "from_matches": False
    }