from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import engine, Base, get_db
from app.routers import segment, library, dictionary

# Создаём таблицы при старте (для разработки)
# В продакшене лучше использовать Alembic
Base.metadata.create_all(bind=engine)

app = FastAPI(title="YueDu", description="Читалка с переводом китайского")

# Подключаем роутеры
app.include_router(segment.router)
app.include_router(library.router)
app.include_router(dictionary.router)

# Статика
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def read_index():
    return FileResponse('static/index.html')
