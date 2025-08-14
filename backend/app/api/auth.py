from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserPublic, UserLogin
from app.schemas.user import UserLogin
from fastapi.responses import JSONResponse
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)
from fastapi import Request

router = APIRouter()

@router.post("/register", response_model=UserPublic)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter_by(nickname=user.nickname).first()
    if existing:
        raise HTTPException(status_code=400, detail="Никнейм уже занят")

    new_user = User(
        first_name=user.first_name,
        last_name=user.last_name,
        middle_name=user.middle_name,
        nickname=user.nickname,
        password=hash_password(user.password),
        role="guest",
        lumina=0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user



@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter_by(nickname=user.nickname).first()
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")

    token = create_access_token({"sub": str(db_user.id)})
    return JSONResponse(content={"access_token": token, "token_type": "bearer"})


@router.get("/me", response_model=UserPublic)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/echo-auth")
def echo_auth(request: Request):
    return {"authorization": request.headers.get("authorization")}
