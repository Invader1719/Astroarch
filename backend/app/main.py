from fastapi import FastAPI
from app.core.database import Base, engine
from app.api import auth  # ← правильно
from fastapi.middleware.cors import CORSMiddleware
from app.api import export as export_api

# Импорт моделей для регистрации таблиц
from app.models import (
    task,
    source,
    topic,
    subtopic,
    task_topic,
    task_subtopic,
    user,
)

# Импорт роутеров
from app.api import (
    task as task_api,
    topic as topic_api,
    source as source_api,
    subtopic as subtopic_api,
    generate as generate_api,
)

app = FastAPI()
Base.metadata.create_all(bind=engine)

app.include_router(task_api.router)
app.include_router(topic_api.router)
app.include_router(source_api.router)
app.include_router(subtopic_api.router)
app.include_router(generate_api.router)
app.include_router(export_api.router)
app.include_router(auth.router, prefix="/auth")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # для разработки * допустимо, потом можно ограничить
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Backend работает!"}
