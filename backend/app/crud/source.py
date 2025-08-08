from sqlalchemy.orm import Session
from app.models.source import Source
from app.schemas.source import SourceCreate

def create_source(db: Session, source: SourceCreate):
    db_source = Source(**source.dict())
    db.add(db_source)
    db.commit()
    db.refresh(db_source)
    return db_source

def get_all_sources(db: Session):
    return db.query(Source).all()
