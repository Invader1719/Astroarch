from sqlalchemy.orm import Session
from app.models.author import Author

def get_authors(db: Session):
    return db.query(Author).order_by(Author.name.asc()).all()

def get_author_by_name(db: Session, name: str):
    return db.query(Author).filter(Author.name == name).first()

def create_author(db: Session, name: str):
    author = Author(name=name)
    db.add(author)
    db.commit()
    db.refresh(author)
    return author

def get_author(db: Session, author_id: int):
    return db.query(Author).filter(Author.id == author_id).first()

def update_author(db: Session, db_author: Author, name: str):
    db_author.name = name
    db.commit()
    db.refresh(db_author)
    return db_author

def delete_author(db: Session, db_author: Author):
    db.delete(db_author)
    db.commit()
