from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json
import os
from ..database import get_db
from ..models import Dictionary

router = APIRouter(
    prefix="/api/dictionary",
    tags=["dictionary"]
)

# Путь к словарю
DICT_PATH = os.path.join(os.getcwd(), "dictionary", "zh_ru.json")

# Загружаем словарь один раз при старте
try:
    with open(DICT_PATH, "r", encoding="utf-8") as f:
        CHINESE_DICT = json.load(f)
except Exception:
    CHINESE_DICT = {}


@router.get("/translate/{word}")
def translate_word(word: str, db: Session = Depends(get_db)):
    """
    Перевод слова: сначала из БД, потом из файла
    ВОЗВРАЩАЕТ ФОРМАТИРОВАННЫЙ ЧИТАЕМЫЙ ПЕРЕВОД
    """
    # Поиск в БД
    db_entry = db.query(Dictionary).filter(Dictionary.word == word).first()
    if db_entry:
        return {
            "word": db_entry.word,
            "pinyin": db_entry.pinyin,
            "translation": db_entry.translation,
            "formatted": True
        }

    # Поиск в статическом словаре
    if word in CHINESE_DICT:
        raw_translation = CHINESE_DICT[word]
        # ИСПРАВЛЕНИЕ: Разбиваем длинный перевод на читаемые пункты
        formatted_translation = raw_translation.replace("1)", "\n1)").replace("2)", "\n2)").replace("3)",
                                                                                                    "\n3)").replace(
            "4)", "\n4)").replace("5)", "\n5)").replace("6)", "\n6)").replace("7)", "\n7)").replace("8)", "\n8)")

        return {
            "word": word,
            "pinyin": "",
            "translation": formatted_translation,
            "formatted": True
        }

    return {"word": word, "translation": "Перевод не найден", "found": False}


@router.get("/search/{query}")
def search_dictionary(query: str):
    """Поиск по словарю"""
    results = []
    for word, trans in CHINESE_DICT.items():
        if query in word or query in trans:
            results.append({"word": word, "translation": trans[:100] + "..."})
    return results[:20]


@router.post("/add")
def add_word_to_dict(word_data: dict, db: Session = Depends(get_db)):
    """Добавить слово в словарь БД"""
    existing = db.query(Dictionary).filter(Dictionary.word == word_data.get("word")).first()
    if existing:
        raise HTTPException(status_code=400, detail="Слово уже существует")

    new_word = Dictionary(
        word=word_data.get("word"),
        pinyin=word_data.get("pinyin", ""),
        translation=word_data.get("translation", "")
    )
    db.add(new_word)
    db.commit()
    return {"status": "success", "word": new_word.word}
