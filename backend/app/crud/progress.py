from sqlalchemy.orm import Session
from app.models.progress_checkpoint import ProgressCheckpoint


def get_all_checkpoints(db: Session):
    return db.query(ProgressCheckpoint).all()


def get_checkpoint(db: Session, olympiad: str, year: int, grade: int):
    return (
        db.query(ProgressCheckpoint)
        .filter(
            ProgressCheckpoint.olympiad == olympiad,
            ProgressCheckpoint.year == year,
            ProgressCheckpoint.grade == grade,
        )
        .first()
    )


def toggle_checkpoint(db: Session, olympiad: str, year: int, grade: int) -> bool:
    """Переключает клетку. Возвращает True, если клетка теперь отмечена."""
    existing = get_checkpoint(db, olympiad, year, grade)
    if existing:
        db.delete(existing)
        db.commit()
        return False
    db.add(ProgressCheckpoint(olympiad=olympiad, year=year, grade=grade))
    db.commit()
    return True
