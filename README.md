# YueDu

Веб-приложение на FastAPI для работы с китайскими текстами, словарями и HSK-лексикой.

## Возможности

- Разбор текстов на слова и сегменты
- Хранение пользовательских текстов и переводов
- Словарь с примерами
- Поддержка HSK (уровни 1–6)
- Использование jieba для сегментации китайского текста

## Требования

- Python 3.13+
- uv (рекомендуется) или pip
- Docker (опционально)

## Быстрый старт (локально, рекомендуется)

```bash
git clone https://github.com/Belligraf/YueDu.git
cd YueDu
```

### Полная последовательность запуска с загрузкой данных в БД

```bash
# 1. Установка зависимостей
make install

# 2. Инициализация базы данных + загрузка данных из словаря
make db-init

# 3. Применение миграций (опционально, но рекомендуется)
make migrate

# 4. Запуск приложения с горячей перезагрузкой
make dev
```

Приложение будет доступно по адресу: **http://127.0.0.1:8000**

> **Примечание**: Команды `make run` и `make dev` автоматически выполняют `make db-init`, поэтому шаги 2 и 4 можно объединить.

### Запуск одной командой (рекомендуется)

```bash
make start
```

Эта команда выполнит:
1. Установку зависимостей (`make install`)
2. Загрузку данных из словаря в БД (`make db-init`)
3. Применение миграций (`make migrate`)
4. Запуск приложения с hot-reload (`make dev`)


## Запуск с горячей перезагрузкой (без Makefile)

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## Использование Makefile

В корне проекта доступен Makefile со следующими командами:

```bash
make install      # Установка зависимостей через uv
make dev          # Запуск с hot-reload (автоматически загружает данные в БД)
make run          # Обычный запуск (автоматически загружает данные в БД)
make db-init      # Загрузка данных из dictionary.db.ex в БД
make migrate      # Применение миграций Alembic
make clean        # Очистка временных файлов и БД
make help         # Показать все доступные команды
```

## Запуск через Docker

### Вариант 1: SQLite (по умолчанию)

```bash
docker compose up --build
```

### Вариант 2: PostgreSQL (рекомендуется)

1. Обновите файл `alembic/env.py`, добавив поддержку переменной окружения `DATABASE_URL`:

```python
import os
from dotenv import load_dotenv

load_dotenv()

# ... остальной код env.py ...

if os.getenv("DATABASE_URL"):
    config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL"))
```

2. Запустите:

```bash
docker compose -f docker-compose-postgres.yml up --build
```

Приложение будет доступно по адресу http://localhost:8000

## Переменные окружения

| Переменная           | Описание                              | По умолчанию                  |
|----------------------|---------------------------------------|-------------------------------|
| `DATABASE_URL`       | Строка подключения к БД               | SQLite (`data/dictionary.db`) |
| `SQLALCHEMY_ECHO`    | Логирование SQL-запросов              | false                         |

Пример `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/yuedu
SQLALCHEMY_ECHO=true
```

## Миграции базы данных

```bash
# Применить миграции
alembic upgrade head

# Создать новую миграцию
alembic revision --autogenerate -m "description"
```

## Полезные команды

```bash
# Очистка базы данных (SQLite)
rm data/dictionary.db

# Пересоздание таблиц
python -c "from app.database import engine, Base; Base.metadata.drop_all(bind=engine); Base.metadata.create_all(bind=engine)"
```

## Структура проекта

```
├── app/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── crud.py
│   ├── schemas.py
│   └── routers/
├── alembic/              # Миграции базы данных
├── data/                 # Файлы БД и словари
├── static/               # Статические файлы
├── pyproject.toml
├── run.py
└── Makefile
```

## Лицензия

Проект распространяется под лицензией, указанной в репозитории.

---

Если у вас возникли вопросы или проблемы с запуском — создайте issue в репозитории.
