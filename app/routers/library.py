from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import UserText, Word, Translation, WordTranslationAssociation

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
    text = db.query(UserText).filter(UserText.id == id).first()
    if not text:
        raise HTTPException(status_code=404, detail="Текст не найден")

    # Удаляем всё старое
    db.query(Word).filter(Word.text_id == id).delete()
    db.query(Translation).filter(Translation.text_id == id).delete()

    # Сохраняем слова
    words = match_data.get("words", [])
    word_map = {}
    for idx, w in enumerate(words):
        db_word = Word(
            text_id=id,
            word=w["word"],
            position=idx,
            part_of_speech=w.get("part_of_speech")
        )
        db.add(db_word)
        db.flush()
        word_map[idx] = db_word.id

    # Сохраняем переводы
    translations = match_data.get("translations", [])
    trans_map = {}
    for idx, t in enumerate(translations):
        db_trans = Translation(
            text_id=id,
            phrase=t["phrase"],
            position=idx,
            part_of_speech=t.get("part_of_speech")
        )
        db.add(db_trans)
        db.flush()
        trans_map[idx] = db_trans.id

    # === СОХРАНЯЕМ СВЯЗИ БЕЗ ДУБЛЕЙ ===
    associations = match_data.get("associations", [])
    for assoc in associations:
        word_pos = assoc.get("word_id") or assoc.get("word_position")
        if word_pos not in word_map:
            continue

        word_id = word_map[word_pos]
        trans_positions = assoc.get("translation_ids") or assoc.get("translation_positions", [])

        for t_pos in set(trans_positions):   # set — убираем дубли на фронте
            if t_pos in trans_map:
                trans_id = trans_map[t_pos]
                # Используем INSERT ... ON CONFLICT DO NOTHING (SQLite)
                association = WordTranslationAssociation(word_id=word_id, translation_id=trans_id)
                db.add(association)

    db.commit()
    return {"status": "success"}


@router.get("/{id}/matches")
def get_matches(id: int, db: Session = Depends(get_db)):
    text = db.query(UserText).filter(UserText.id == id).first()
    if not text:
        raise HTTPException(status_code=404)

    words = db.query(Word).filter(Word.text_id == id).order_by(Word.position).all()
    translations = db.query(Translation).filter(Translation.text_id == id).order_by(Translation.position).all()

    words_data = []
    for w in words:
        words_data.append({
            "id": w.id,
            "word": w.word,
            "position": w.position,
            "translation_ids": [t.id for t in w.translations],
            "part_of_speech": w.part_of_speech
        })

    translations_data = []
    for t in translations:
        translations_data.append({
            "id": t.id,
            "phrase": t.phrase,
            "position": t.position,
            "part_of_speech": t.part_of_speech   # <-- ДОБАВЛЕНО
        })

    return {
        "words": words_data,
        "translations": translations_data
    }

@router.patch("/words/{word_id}")
def update_word_part_of_speech(word_id: int, data: dict, db: Session = Depends(get_db)):
    word = db.query(Word).filter(Word.id == word_id).first()
    if not word:
        raise HTTPException(404, detail="Word not found")
    word.part_of_speech = data.get("part_of_speech")
    db.commit()
    return {"status": "ok", "part_of_speech": word.part_of_speech}


@router.patch("/translations/{translation_id}")
def update_translation_part_of_speech(translation_id: int, data: dict, db: Session = Depends(get_db)):
    trans = db.query(Translation).filter(Translation.id == translation_id).first()
    if not trans:
        raise HTTPException(status_code=404, detail="Translation not found")
    trans.part_of_speech = data.get("part_of_speech")
    db.commit()
    return {"status": "ok", "part_of_speech": trans.part_of_speech}


@router.delete("/{id}")
def delete_text(id: int, db: Session = Depends(get_db)):
    text = db.query(UserText).filter(UserText.id == id).first()
    if not text:
        raise HTTPException(status_code=404)
    db.delete(text)
    db.commit()
    return {"message": "Text deleted"}