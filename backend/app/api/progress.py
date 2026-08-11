from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import SessionLocal
from app.schemas.progress import SourceCoverageOut
from app.crud import progress as crud_progress

router = APIRouter(prefix="/progress", tags=["progress"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=List[SourceCoverageOut])
def get_progress(db: Session = Depends(get_db)):
    """По каким годам/классам реально есть задачи в каждом источнике —
    считается на лету из Task/Source, без отдельного хранилища прогресса."""
    return crud_progress.get_source_coverage(db)
