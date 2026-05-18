from fastapi import FastAPI, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import FileResponse

from app.database import engine, Base, get_db
from app.routers import segment, library, dictionary
from app.models import UserText

Base.metadata.create_all(bind=engine)

app = FastAPI(title="YueDu")

app.include_router(segment.router)
app.include_router(library.router)
app.include_router(dictionary.router)

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="app/templates")


@app.get("/")
async def read_index():
    return FileResponse('static/index.html')


@app.get("/reader/{text_id}")
async def reader_page(
        text_id: int,
        request: Request,
        db=Depends(get_db)
):
    """Страница читалки"""
    text = db.query(UserText).filter_by(id=text_id).first()

    title = text.title if text and text.title else f"Текст #{text_id}"

    # Важно: request идёт ПЕРВЫМ аргументом!
    return templates.TemplateResponse(
        request,
        "reader.html",
        {
            "request": request,
            "title": title,
            "text_id": text_id
        }
    )


@app.get("/debug")
async def debug():
    return {"status": "ok", "message": "Сервер работает"}