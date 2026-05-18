from sqlalchemy.orm import Session
import jieba
import jieba.posseg as pseg

from app.models import UserText, TextSegment, HSKWord


def create_text_segments(db: Session, text_id: int):
    """Создаёт сегменты для текста + определяет HSK и POS"""

    text = db.query(UserText).filter_by(id=text_id).first()
    if not text or not text.content:
        return False

    # Удаляем старые сегменты, если есть
    db.query(TextSegment).filter_by(text_id=text_id).delete()

    # Настраиваем jieba
    jieba.initialize()

    segments = []
    position = 0

    # Разбиваем с POS-тегами
    words = pseg.cut(text.content)

    for word, pos in words:
        if not word.strip():
            continue

        # Ищем уровень HSK
        hsk = db.query(HSKWord.level).filter_by(word=word).scalar()

        segment = TextSegment(
            text_id=text_id,
            position=position,
            original_word=word,
            pinyin="",  # можно позже заполнить из Dictionary
            part_of_speech=pos,
            hsk_level=hsk,
            confidence=1.0
        )
        segments.append(segment)
        position += 1

    db.bulk_save_objects(segments)
    db.commit()

    print(f"✅ Создано {len(segments)} сегментов для текста ID={text_id} (средний HSK: {text.hsk_level_avg or '—'})")
    return True