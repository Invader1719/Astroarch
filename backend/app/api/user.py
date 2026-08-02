from fastapi import APIRouter, Depends, HTTPException, Security
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserPublic
from app.dependencies.auth import require_role

router = APIRouter()

# Роль "founder" здесь не назначается никому и никогда — только напрямую в БД.
# И founder, и admin (следующий по старшинству) могут назначать любую из этих ролей.
ASSIGNABLE_ROLES = ("guest", "user", "moderator", "admin")


class RoleUpdate(BaseModel):
    role: str


@router.get("/users/", response_model=List[UserPublic])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "founder")),
):
    return db.query(User).order_by(User.id).all()


@router.patch("/users/{user_id}/role", response_model=UserPublic)
def update_user_role(
    user_id: int,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "founder")),
):
    if data.role not in ASSIGNABLE_ROLES:
        raise HTTPException(status_code=400, detail="Эту роль нельзя назначить здесь")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if target.role == "founder":
        raise HTTPException(status_code=403, detail="Роль фаундера нельзя изменить здесь")

    target.role = data.role
    db.commit()
    db.refresh(target)
    return target
