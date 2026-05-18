import sys
from pathlib import Path
from sqlalchemy.orm import Session

BASE_DIR = Path(__file__).parent.parent.parent.resolve()
sys.path.insert(0, str(BASE_DIR))

from app.database import SessionLocal
from app.models import HSKWord


def load_hsk_from_csv(csv_path: str = "data/hsk30.csv"):
    db: Session = SessionLocal()
    try:
        full_path = BASE_DIR / csv_path
        if not full_path.exists():
            print(f"❌ Файл не найден: {full_path}")
            return

        print(f"✅ Файл: {full_path.name} ({full_path.stat().st_size / (1024 * 1024):.1f} MB)")

        # Полная очистка
        print("🗑️ Очищаем таблицу hsk_words...")
        db.query(HSKWord).delete()
        db.commit()
        print("✅ Таблица очищена")

        print("🚀 Загружаем HSK 3.0...")

        import csv
        count = 0
        skipped = 0
        seen = set()  # Защита от дубликатов в памяти

        batch = []
        batch_size = 1000

        with open(full_path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            for row in reader:
                raw_word = row.get('Simplified', '').strip()
                if not raw_word:
                    continue

                word = raw_word.split('|')[0].strip()  # берём только первое слово

                if word in seen:
                    skipped += 1
                    continue

                level_str = row.get('Level', '0').strip()
                pinyin = row.get('Pinyin', '').strip()

                try:
                    level = int(level_str)
                except:
                    continue

                if word and level >= 1:
                    seen.add(word)
                    entry = HSKWord(
                        word=word,
                        level=level,
                        pinyin=pinyin,
                        translation=""
                    )
                    batch.append(entry)
                    count += 1

                    if len(batch) >= batch_size:
                        db.bulk_save_objects(batch)
                        db.commit()
                        batch.clear()
                        if count % 5000 == 0:
                            print(f"   ✅ Загружено: {count:,} слов")

        # Последний batch
        if batch:
            db.bulk_save_objects(batch)
            db.commit()

        print(f"\n🎉 УСПЕШНО ЗАГРУЖЕНО!")
        print(f"   Добавлено слов: {count:,}")
        print(f"   Пропущено: {skipped}")

    finally:
        db.close()


if __name__ == "__main__":
    load_hsk_from_csv()