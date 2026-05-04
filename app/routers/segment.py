from fastapi import APIRouter
import jieba
import re

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
