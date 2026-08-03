from fastapi import APIRouter, Depends, Security
from sqlalchemy.orm import Session
from typing import List

from app.core.database import SessionLocal
from app.schemas.progress import ProgressCellIn, ProgressCellOut
from app.crud import progress as crud_progress
from app.dependencies.auth import require_role
from app.models.user import User

router = APIRouter(prefix="/progress", tags=["progress"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=List[ProgressCellOut])
def list_checkpoints(db: Session = Depends(get_db)):
    return crud_progress.get_all_checkpoints(db)


@router.post("/toggle")
def toggle_checkpoint(
    payload: ProgressCellIn,
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "founder")),
):
    checked = crud_progress.toggle_checkpoint(db, payload.olympiad, payload.year, payload.grade)
    return {"checked": checked}
