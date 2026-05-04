from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import UserText, Word, Translation, word_translation_association

router = APIRouter(
    prefix="/api/library",
    tags=["library"]
)


# CRUD для текстов
@router.post("/")
def create_text(text_data: dict, db: Session = Depends(get_db)):
    new_text = UserText(
        title=text_data.get("title", "Без названия"),
        content=text_data.get("content", ""),
        translation=text_data.get("translation", "")
    )
    db.add(new_text)
    db.commit()
    db.refresh(new_text)
    return new_text


@router.get("/")
def get_all_texts(db: Session = Depends(get_db)):
    return db.query(UserText).all()


@router.get("/{id}")
def get_text(id: int, db: Session = Depends(get_db)):
    text = db.query(UserText).filter(UserText.id == id).first()
    if not text:
        raise HTTPException(status_code=404, detail="Текст не найден")
    return text


# --- ЭНДПОИНТ ДЛЯ СОПОСТАВЛЕНИЙ ---
@router.post("/{id}/matches")
def save_matches(id: int, match_data: dict, db: Session = Depends(get_db)):
    """
    ГЛАВНЫЙ ЭНДПОИНТ ДЛЯ КНОПКИ "СОПОСТАВИТЬ СЛОВА"
    Сохраняет связи многие-ко-многим
    """
    text = db.query(UserText).filter(UserText.id == id).first()
    if not text:
        raise HTTPException(status_code=404)

    # Удаляем старые сопоставления
    db.query(Word).filter(Word.text_id == id).delete()
    db.query(Translation).filter(Translation.text_id == id).delete()

    # Сохраняем слова
    words = match_data.get("words", [])
    word_map = {}
    for idx, w in enumerate(words):
        db_word = Word(text_id=id, word=w["word"], position=w.get("position", idx))
        db.add(db_word)
        db.flush()
        word_map[idx] = db_word.id

    # Сохраняем переводы
    translations = match_data.get("translations", [])
    trans_map = {}
    for idx, t in enumerate(translations):
        db_trans = Translation(text_id=id, phrase=t["phrase"], position=t.get("position", idx))
        db.add(db_trans)
        db.flush()
        trans_map[idx] = db_trans.id

    # Связи многие-ко-многим
    associations = match_data.get("associations", [])
    for assoc in associations:
        word_id = word_map[assoc["word_id"]]
        for tid in assoc["translation_ids"]:
            trans_id = trans_map[tid]
            db.execute(
                word_translation_association.insert().values(word_id=word_id, translation_id=trans_id)
            )

    db.commit()
    return {"status": "success", "message": "Сопоставления сохранены!"}


@router.get("/{id}/matches")
def get_matches(id: int, db: Session = Depends(get_db)):
    """Получить сохраненные сопоставления"""
    words = db.query(Word).filter(Word.text_id == id).order_by(Word.position).all()
    translations = db.query(Translation).filter(Translation.text_id == id).order_by(Translation.position).all()

    return {
        "words": [{"id": w.id, "word": w.word, "position": w.position} for w in words],
        "translations": [{"id": t.id, "phrase": t.phrase, "position": t.position} for t in translations]
    }
