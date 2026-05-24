import sys
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# ==================== КОРРЕКТНЫЕ ПУТИ ====================
PROJECT_ROOT = Path(__file__).parent.parent.parent.resolve()  # ← теперь корень проекта
DATA_DIR = PROJECT_ROOT / "data"
DB_PATH = DATA_DIR / "dictionary.db"

print(f"📍 PROJECT_ROOT: {PROJECT_ROOT}")
print(f"📍 DATA_DIR: {DATA_DIR}")
print(f"📍 DB: {DB_PATH}\n")

# Создаём engine
engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Импортируем модели
sys.path.insert(0, str(PROJECT_ROOT))
from app.models import Dictionary, Base


def clean_dsl_to_html(text: str) -> str:
    if not text:
        return ""

    import re

    # 1. Основные замены тегов
    text = re.sub(r"\[i\](.*?)\[/i\]", r"<i>\1</i>", text)
    text = re.sub(r"\[b\](.*?)\[/b\]", r"<b>\1</b>", text)
    text = re.sub(r"\[ref\].*?\[/ref\]", "", text)

    # 2. [m1], [m2], [m3]... → новые абзацы с отступом
    text = re.sub(r"\[m(\d+)\]", r"\n\n", text)

    # 3. Обработка примеров [ex] ... [/ex]
    text = re.sub(r"\[\*]\[ex\](.*?)\[/ex]\[/\*]", r"<br><small>→ \1</small>", text)

    # 4. Убираем все оставшиеся теги
    text = re.sub(r"\[.*?\]", "", text)

    # 5. Красивое форматирование строк
    lines = [line.strip() for line in text.split('\n') if line.strip()]

    formatted = []
    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Римские цифры или номера значений
        if re.match(r'^[IVX]+', line) or re.match(r'^\d+\)', line):
            formatted.append(f"<br><b>{line}</b>")
        # Части речи (прил., наречие и т.д.)
        elif re.search(r'прил|сущ|гл|наречие', line):
            formatted.append(f"<small><i>{line}</i></small>")
        else:
            formatted.append(line)

    result = "<br>".join(formatted)
    # Дополнительные переносы для читаемости
    result = result.replace("<br><br><br>", "<br><br>")

    return f"<p>{result}</p>" if result else ""


def import_bkrs():
    file_path = DATA_DIR / "dabkrs_260509"

    if not file_path.exists():
        print(f"❌ Файл не найден: {file_path}")
        return

    print(f"✅ DSL файл найден: {file_path}")
    print(f"📏 Размер: {file_path.stat().st_size / (1024*1024):.1f} MB\n")

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    batch = []
    batch_size = 1000
    count = 0

    current_word = None
    current_pinyin = None
    current_translation_parts = []

    print("🚀 Начинаю импорт словаря...")

    with open(file_path, 'r', encoding='utf-8-sig', errors='replace') as f:
        for line in f:
            line = line.rstrip('\n\r')
            if not line or line.startswith('#'):
                continue

            if not line.startswith((' ', '\t')) and any('\u4e00' <= c <= '\u9fff' for c in line):
                # Сохраняем предыдущее слово
                if current_word:
                    full_trans = " ".join(current_translation_parts)
                    entry = Dictionary(
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
                            print(f"   ✅ Импортировано: {count:,} записей")

                current_word = line
                current_pinyin = None
                current_translation_parts = []

            elif current_word:
                stripped = line.strip()
                if stripped:
                    if not current_pinyin and not current_translation_parts and not stripped.startswith('['):
                        current_pinyin = stripped
                    else:
                        current_translation_parts.append(stripped)

    # Последнее слово
    if current_word:
        full_trans = " ".join(current_translation_parts)
        batch.append(Dictionary(
            word=current_word.strip(),
            pinyin=current_pinyin.strip() if current_pinyin else "",
            translation=clean_dsl_to_html(full_trans),
            examples=""
        ))
        count += 1

    if batch:
        db.bulk_save_objects(batch)
        db.commit()

    print(f"\n🎉 ИМПОРТ ЗАВЕРШЁН! Всего записей: {count:,}")
    db.close()

if __name__ == "__main__":
    import_bkrs()