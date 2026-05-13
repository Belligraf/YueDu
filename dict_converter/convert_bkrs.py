import sys
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# ==================== ЖЁСТКАЯ НАСТРОЙКА ====================
BASE_DIR = Path(__file__).parent.parent.resolve()
DB_PATH = BASE_DIR / "data" / "dictionary.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# Полностью игнорируем старый database.py
os.environ["SQLITE_DB_PATH"] = str(DB_PATH)

# Создаём engine вручную
engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

print(f"✅ ЖЁСТКО используем БД: {engine.url}")
print(f"📍 Физический файл: {DB_PATH}\n")
# ========================================================

# Импортируем модели
sys.path.insert(0, str(BASE_DIR))
from app import models
from sqlalchemy.orm import Session

def clean_dsl_to_html(text: str) -> str:
    if not text:
        return ""
    import re
    text = re.sub(r"\[i\](.*?)\[/i\]", r"<i>\1</i>", text)
    text = re.sub(r"\[b\](.*?)\[/b\]", r"<b>\1</b>", text)
    text = re.sub(r"\[ref\].*?\[/ref\]", "", text)
    text = re.sub(r"\[.*?\]", "", text)
    return " ".join(text.split())


def import_bkrs():
    file_path = BASE_DIR / ".local" / "dabkrs_260509" / "dabkrs_260509"

    print(f"✅ DSL файл: {file_path}")
    print(f"📏 Размер: {file_path.stat().st_size / (1024*1024):.1f} MB\n")

    models.Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    batch = []
    batch_size = 1000
    count = 0

    current_word = None
    current_pinyin = None
    current_translation_parts = []

    print("🚀 Начинаю импорт...")

    with open(file_path, 'r', encoding='utf-8-sig', errors='replace') as f:
        for line in f:
            line = line.rstrip('\n\r')

            if not line or line.startswith('#'):
                continue

            if not line.startswith((' ', '\t')) and any('\u4e00' <= c <= '\u9fff' for c in line):
                if current_word:
                    full_trans = " ".join(current_translation_parts)
                    entry = models.Dictionary(
                        word=current_word.strip(),
                        pinyin=current_pinyin.strip() if current_pinyin else "",
                        translation=clean_dsl_to_html(full_trans),
                        examples=""
                    )
                    batch.append(entry)
                    count += 1

                    if len(batch) >= batch_size:
                        db.bulk_save_objects(batch)
                        db.commit()
                        batch.clear()
                        if count % 5000 == 0:
                            print(f"   ✅ Импортировано: {count:,} слов")

                current_word = line
                current_pinyin = None
                current_translation_parts = []

            elif current_word:
                stripped = line.strip()
                if stripped:
                    if any(tag in stripped for tag in ["[m", "[ex", "[c", "[p", "[tr"]):
                        current_translation_parts.append(stripped)
                    elif not current_pinyin and not current_translation_parts:
                        current_pinyin = stripped
                    else:
                        current_translation_parts.append(stripped)

    # Последнее слово
    if current_word:
        full_trans = " ".join(current_translation_parts)
        batch.append(models.Dictionary(
            word=current_word.strip(),
            pinyin=current_pinyin.strip() if current_pinyin else "",
            translation=clean_dsl_to_html(full_trans),
            examples=""
        ))
        count += 1

    if batch:
        db.bulk_save_objects(batch)
        db.commit()

    print(f"\n🎉 ИМПОРТ ЗАВЕРШЁН! Всего слов: {count:,}")
    db.close()


if __name__ == "__main__":
    import_bkrs()