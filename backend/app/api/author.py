from fastapi import APIRouter, Depends, HTTPException, Security, status
from sqlalchemy.exc import IntegrityError
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

@router.patch("/authors/{author_id}", response_model=AuthorOut)
def update_author(
    author_id: int,
    data: AuthorCreate,
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "founder")),
):
    db_author = crud_author.get_author(db, author_id)
    if not db_author:
        raise HTTPException(status_code=404, detail="Автор не найден")
    name = (data.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Имя автора не может быть пустым")
    existing = crud_author.get_author_by_name(db, name)
    if existing and existing.id != author_id:
        raise HTTPException(status_code=409, detail="Автор с таким именем уже существует")
    return crud_author.update_author(db, db_author, name)

@router.delete("/authors/{author_id}", status_code=204)
def delete_author(
    author_id: int,
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "founder")),
):
    db_author = crud_author.get_author(db, author_id)
    if not db_author:
        raise HTTPException(status_code=404, detail="Автор не найден")
    # авторы прикреплены к задачам через связь many-to-many (task_author) — при
    # db.delete() SQLAlchemy сам вычищает строки в task_author, поэтому
    # IntegrityError тут никогда не сработает, проверяем явно
    if db_author.tasks:
        raise HTTPException(status_code=409, detail="Нельзя удалить — автор используется в задачах")
    try:
        crud_author.delete_author(db, db_author)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Нельзя удалить — автор используется в задачах")
