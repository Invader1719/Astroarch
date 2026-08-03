from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.task_image import TaskImage
from app.services.task_images import find_image_ids


def create_task_image(db: Session, content_type: str, size: int) -> TaskImage:
    img = TaskImage(filename="", content_type=content_type, size=size)
    db.add(img)
    db.commit()
    db.refresh(img)
    return img


def set_filename(db: Session, img: TaskImage, filename: str) -> TaskImage:
    img.filename = filename
    db.commit()
    db.refresh(img)
    return img


def get_task_image(db: Session, image_id: int) -> Optional[TaskImage]:
    return db.query(TaskImage).filter(TaskImage.id == image_id).first()


def attach_images_to_task(db: Session, task_id: int, texts: List[Optional[str]]) -> None:
    """Проставляет task_id всем картинкам, на которые ссылаются переданные тексты."""
    ids = set()
    for t in texts:
        ids |= find_image_ids(t)
    if not ids:
        return
    db.query(TaskImage).filter(TaskImage.id.in_(ids)).update(
        {"task_id": task_id}, synchronize_session=False
    )
    db.commit()
