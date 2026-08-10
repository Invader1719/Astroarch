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

def get_source_by_name(db: Session, name: str):
    return db.query(Source).filter(Source.name == name).first()

def get_source(db: Session, source_id: int):
    return db.query(Source).filter(Source.id == source_id).first()

def update_source(db: Session, db_source: Source, name: str, description: str | None = None):
    db_source.name = name
    db_source.description = description
    db.commit()
    db.refresh(db_source)
    return db_source

def delete_source(db: Session, db_source: Source):
    db.delete(db_source)
    db.commit()
