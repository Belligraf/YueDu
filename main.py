from fastapi import FastAPI, Request, Depends
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import jieba
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

import database
from models import models


# Lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Создаём таблицы при старте (если нет миграций)
    models.Base.metadata.create_all(bind=database.engine)
    print("✅ База данных инициализирована")
    yield


app = FastAPI(title="Chinese Reader", lifespan=lifespan)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

from pydantic import BaseModel  # Добавьте этот импорт

# Создайте модель данных
class TextData(BaseModel):
    text: str

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        request=request, name="index.html", context={}
    )

@app.post("/segment")
async def segment_text(data: TextData): # Ожидаем JSON модель
    # Теперь текст лежит внутри data.text
    words = list(jieba.cut(data.text.strip(), cut_all=False))
    return {"words": [w for w in words if w.strip()]}


@app.get("/translate/{word}")
async def translate(word: str, db: Session = Depends(database.get_db)):
    result = db.query(models.Dictionary).filter(models.Dictionary.word == word).first()

    if result:
        return {
            "pinyin": result.pinyin,
            "translation": result.translation,
            "examples": result.examples
        }
    return {"pinyin": "", "translation": "Перевод не найден", "examples": ""}


@app.get("/check_db")
async def check_db(db: Session = Depends(database.get_db)):
    count = db.query(models.Dictionary).count()
    first_row = db.query(models.Dictionary).first()
    return {
        "total_records": count,
        "first_row": first_row.word if first_row else "База пуста"
    }