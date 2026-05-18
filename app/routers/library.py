from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import UserText, Word, Translation, WordTranslationAssociation, TextSegment
from ..utils.segment import create_text_segments   # ← Новый импорт

router = APIRouter(
    prefix="/api/library",
    tags=["library"]
)


# ====================== CRUD ======================
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

    try:
        create_text_segments(db, new_text.id)
    except Exception as e:
        print(f"⚠️ Ошибка создания сегментов: {e}")

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


# ====================== СЕГМЕНТЫ ======================
@router.post("/{id}/segments/create")
def force_create_segments(id: int, db: Session = Depends(get_db)):
    """Принудительное создание/обновление сегментов"""
    success = create_text_segments(db, id)
    if success:
        return {"status": "success", "message": f"Сегменты для текста {id} созданы"}
    raise HTTPException(500, detail="Не удалось создать сегменты")


@router.get("/{id}/segments")
def get_text_segments(id: int, db: Session = Depends(get_db)):
    """Получить сегменты для чтения (главный эндпоинт для ридера)"""
    segments = db.query(TextSegment)\
                 .filter(TextSegment.text_id == id)\
                 .order_by(TextSegment.position)\
                 .all()

    return {
        "text_id": id,
        "segments": [
            {
                "position": s.position,
                "word": s.original_word,
                "pinyin": s.pinyin or "",
                "pos": s.part_of_speech,
                "hsk": s.hsk_level
            }
            for s in segments
        ]
    }


# ====================== ОСТАЛЬНОЕ (без изменений) ======================
@router.post("/{id}/matches")
def save_matches(id: int, match_data: dict, db: Session = Depends(get_db)):
    text = db.query(UserText).filter(UserText.id == id).first()
    if not text:
        raise HTTPException(status_code=404, detail="Текст не найден")

    # Удаляем ВСЕ старые связи и слова/переводы
    db.query(WordTranslationAssociation).filter(
        WordTranslationAssociation.word_id.in_(
            db.query(Word.id).filter(Word.text_id == id)
        )
    ).delete(synchronize_session=False)

    db.query(Word).filter(Word.text_id == id).delete()
    db.query(Translation).filter(Translation.text_id == id).delete()

    # Сохраняем слова
    words = match_data.get("words", [])
    word_map = {}  # position -> id
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
    trans_map = {}  # position -> id
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
    seen = set()

    for assoc in associations:
        word_pos = assoc.get("word_id") or assoc.get("word_position")
        if word_pos not in word_map:
            continue

        word_id = word_map[word_pos]
        trans_positions = assoc.get("translation_ids") or assoc.get("translation_positions", [])

        for t_pos in set(trans_positions):   # убираем дубли на уровне данных
            if t_pos not in trans_map:
                continue
            trans_id = trans_map[t_pos]

            # Защита от дубликатов
            key = (word_id, trans_id)
            if key in seen:
                continue
            seen.add(key)

            association = WordTranslationAssociation(
                word_id=word_id,
                translation_id=trans_id
            )
            db.add(association)

    db.commit()
    return {"status": "success", "message": "Связи сохранены"}

@router.get("/{id}/matches")
def get_matches(id: int, db: Session = Depends(get_db)):
    text = db.query(UserText).filter(UserText.id == id).first()
    if not text:
        raise HTTPException(status_code=404, detail="Текст не найден")

    words = db.query(Word)\
              .filter(Word.text_id == id)\
              .order_by(Word.position)\
              .all()

    translations = db.query(Translation)\
                     .filter(Translation.text_id == id)\
                     .order_by(Translation.position)\
                     .all()

    # Получаем связи через ассоциативную таблицу
    word_trans_map = {}
    for word in words:
        # Запрашиваем связанные translation_id для каждого слова
        assoc_ids = db.query(WordTranslationAssociation.translation_id)\
                      .filter(WordTranslationAssociation.word_id == word.id)\
                      .all()
        word_trans_map[word.position] = [row[0] for row in assoc_ids]

    return {
        "words": [
            {
                "id": w.id,
                "position": w.position,
                "word": w.word,
                "part_of_speech": w.part_of_speech,
                "translation_ids": word_trans_map.get(w.position, [])
            } for w in words
        ],
        "translations": [
            {
                "id": t.id,
                "position": t.position,
                "phrase": t.phrase,
                "part_of_speech": t.part_of_speech
            } for t in translations
        ]
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
