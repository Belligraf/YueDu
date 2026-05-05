import re
from app import models, database
from sqlalchemy.orm import Session

# Укажите путь к вашему распакованному файлу БКРС
BKRS_FILE_PATH = "D:\\BKRS\\dabkrs_260505\\dabkrs_260505"


def clean_dsl_to_html(text):
    """
    Превращает DSL разметку в чистый HTML для фронтенда.
    """
    if not text:
        return ""

    # 1. Заменяем курсив и жирный на соответствующие HTML теги
    text = re.sub(r"\[i\](.*?)\[/i\]", r"<i>\1</i>", text)
    text = re.sub(r"\[b\](.*?)\[/b\]", r"<b>\1</b>", text)

    # 2. Ссылки на другие слова [ref]слово[/ref] -> просто текст
    text = re.sub(r"\[ref\].*?\[/ref\]", lambda m: m.group(0).replace("[ref]", "").replace("[/ref]", ""), text)

    # 3. Удаляем все остальные служебные теги (m1, m2, p, c, ex и т.д.)
    text = re.sub(r"\[.*?\]", "", text)

    # Убираем лишние пробелы, возникающие при склейке строк
    return text.strip()


def import_bkrs():
    # ШАГ 1: Создаем таблицы в БД, если их еще нет
    print("🛠 Подготовка базы данных...")
    models.Base.metadata.create_all(bind=database.engine)

    db: Session = database.SessionLocal()

    # ШАГ 2: Проверка кодировки и открытие файла
    try:
        # DSL обычно в UTF-16 LE с BOM
        f = open(BKRS_FILE_PATH, 'r', encoding='utf-16')
        f.read(1)  # Пробное чтение
        f.seek(0)
    except (UnicodeError, UnicodeDecodeError):
        f = open(BKRS_FILE_PATH, 'r', encoding='utf-8')

    batch_size = 2000
    entries = []
    count = 0

    current_word = None
    current_pinyin = None
    current_translation_parts = []

    print("🚀 Начинаю импорт словаря БКРС...")

    for line in f:
        # Убираем символ BOM (\ufeff) и лишние пробелы по краям
        line = line.lstrip('\ufeff')

        # Пропускаем служебные заголовки и пустые строки
        if not line.strip() or line.startswith('#'):
            continue

        # ПРОВЕРКА: Новое слово или продолжение описания?
        # Если строка НЕ начинается с отступа (пробел, таб или специальный пробел)
        if not line.startswith(('\t', ' ', '\xa0')):

            # Если мы уже собрали предыдущее слово — сохраняем его в список
            if current_word:
                full_trans = " ".join(current_translation_parts)
                entry = models.Dictionary(
                    word=current_word.strip(),
                    pinyin=current_pinyin.strip() if current_pinyin else "",
                    translation=clean_dsl_to_html(full_trans),
                    examples=""
                )
                entries.append(entry)
                count += 1

            # Подготовка для НОВОГО слова
            current_word = line.strip()
            current_pinyin = None
            current_translation_parts = []

            # Массовая вставка в БД (для скорости и экономии памяти)
            if len(entries) >= batch_size:
                try:
                    db.bulk_save_objects(entries)
                    db.commit()
                    print(f"✅ Загружено {count} слов...")
                except Exception as e:
                    print(f"⚠️ Ошибка при вставке пачки: {e}")
                    db.rollback()
                entries = []

        else:
            # Если строка С ОТСТУПОМ — это пиньинь или перевод
            content = line.strip()
            if not content:
                continue

            # Если в строке есть тег [m] — это точно перевод
            if "[m" in line:
                current_translation_parts.append(content)
            else:
                # Если тегов нет и мы еще не нашли пиньинь — это он
                if not current_pinyin and not current_translation_parts:
                    current_pinyin = content
                else:
                    # Иначе это просто дополнительная строка перевода
                    current_translation_parts.append(content)

    # ШАГ 3: Сохраняем последний "хвост" данных
    if current_word:
        full_trans = " ".join(current_translation_parts)
        entries.append(models.Dictionary(
            word=current_word.strip(),
            pinyin=current_pinyin.strip() if current_pinyin else "",
            translation=clean_dsl_to_html(full_trans),
            examples=""
        ))

    if entries:
        db.bulk_save_objects(entries)
        db.commit()

    print(f"✨ Импорт завершен! Всего слов в базе: {count}")
    db.close()
    f.close()


if __name__ == "__main__":
    import_bkrs()