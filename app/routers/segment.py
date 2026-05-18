from fastapi import APIRouter, Depends
import jieba
import re

from sqlalchemy.orm import Session

from app.database import get_db
from app.models import TextSegment

router = APIRouter(
    prefix="/api/segment",
    tags=["segment"]
)

# Регулярка: только китайские иероглифы
CHINESE_REGEX = re.compile(r'[\u4e00-\u9fff]')
# Все символы, которые нужно оставить как отдельные токены
PUNCTUATION = set('，。！？；：""''（）【】,.!?;:"\'()[]')


def split_chinese_text_correctly(text: str):
    """
    ИСПРАВЛЕННЫЙ АЛГОРИТМ РАЗБИВКИ
    - Китайские слова отдельно
    - Пунктуация отдельно
    - Пробелы и переносы сохраняются
    - НЕ разбивает иерогливы по одному (использует jieba)
    """
    tokens = []
    words = jieba.lcut(text)  # Разбиваем на слова через jieba

    for word in words:
        if not word:
            continue
        # Если это пунктуация — добавляем как есть
        if word in PUNCTUATION or word.isspace():
            tokens.append(word)
        # Если это китайское слово — добавляем целиком
        elif CHINESE_REGEX.search(word):
            tokens.append(word)
        # Остальной текст (цифры, латинка) — как есть
        else:
            tokens.append(word)
    return tokens


@router.post("/segment")
def segment_text(data: dict):
    text = data.get("text", "")
    if not text:
        return {"words": []}

    segmented = split_chinese_text_correctly(text)
    # Фильтруем пустые строки
    segmented = [t for t in segmented if t.strip() or t in PUNCTUATION]

    return {
        "original": text,
        "words": segmented,
        "count": len(segmented)
    }


@router.get("/text/{text_id}")
async def get_text_for_reader(text_id: int, db: Session = Depends(get_db)):
    """Эндпоинт специально для читалки"""
    segments = db.query(TextSegment) \
        .filter(TextSegment.text_id == text_id) \
        .order_by(TextSegment.position) \
        .all()

    if not segments:
        try:
            from app.utils.segment import create_text_segments
            create_text_segments(db, text_id)

            # Перезапрашиваем после создания
            segments = db.query(TextSegment) \
                .filter(TextSegment.text_id == text_id) \
                .order_by(TextSegment.position) \
                .all()
        except Exception as e:
            print(f"Ошибка создания сегментов: {e}")

    return {
        "text_id": text_id,
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
