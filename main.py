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


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/segment")
async def segment_text(text: str):
    words = list(jieba.cut(text.strip(), cut_all=False))
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