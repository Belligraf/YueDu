from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.database import engine, Base
from app.routers import segment, library, dictionary  # Добавили dictionary

# Создаем таблицы
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Chinese Reader", description="Читалка с переводом китайского")

# Подключаем роутеры
app.include_router(segment.router)
app.include_router(library.router)
app.include_router(dictionary.router)  # 👈 ДОБАВИТЬ ЭТУ СТРОКУ

# Статика
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')