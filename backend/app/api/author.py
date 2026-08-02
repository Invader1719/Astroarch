from fastapi import APIRouter, Depends, HTTPException, Security, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import SessionLocal
from app.schemas.author import AuthorCreate, AuthorOut
from app.crud import author as crud_author
from app.dependencies.auth import require_role
from app.models.user import User

router = APIRouter(tags=["authors"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/authors/", response_model=List[AuthorOut])
def list_authors(db: Session = Depends(get_db)):
    # можно добавить сортировку в crud, см. файл ниже
    return crud_author.get_authors(db)

@router.post("/authors/", response_model=AuthorOut, status_code=status.HTTP_201_CREATED)
def add_author(
    data: AuthorCreate,
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "founder")),
):
    name = (data.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Имя автора не может быть пустым")

    existing = crud_author.get_author_by_name(db, name)
    if existing:
        # 409 — явный конфликт уникальности
        raise HTTPException(status_code=409, detail="Автор с таким именем уже существует")

    return crud_author.create_author(db, name)
