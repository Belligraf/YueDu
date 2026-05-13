import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Загружаем .env
from dotenv import load_dotenv

load_dotenv()

# ====================== НАСТРОЙКА БД ======================

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # === SQLite по умолчанию (локальная разработка) ===
    DATA_DIR = Path("data")
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    DB_PATH = DATA_DIR / "dictionary.db"
    DATABASE_URL = f"sqlite:///{DB_PATH.absolute()}"

    print(f"🟢 SQLite используется: {DB_PATH.absolute()}")
else:
    print(f"🔵 Используется внешняя БД: {DATABASE_URL}")

# ====================== ДВИЖОК ======================

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=os.getenv("SQLALCHEMY_ECHO", "false").lower() == "true"
    )
else:
    # PostgreSQL и другие
    engine = create_engine(
        DATABASE_URL,
        pool_size=15,
        max_overflow=30,
        pool_pre_ping=True,
        echo=os.getenv("SQLALCHEMY_ECHO", "false").lower() == "true"
    )

# ====================== СЕССИИ ======================

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Зависимость FastAPI для получения сессии БД"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()