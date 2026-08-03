import os

from fastapi import APIRouter, Depends, HTTPException, Security, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.schemas.task_image import TaskImageOut
from app.crud import task_image as crud_task_image
from app.dependencies.auth import require_role
from app.models.user import User
from app.services.task_images import UPLOAD_DIR

router = APIRouter(prefix="/task-images", tags=["task-images"])

MAX_SIZE = 5 * 1024 * 1024  # 5 МБ
EXT_BY_CONTENT_TYPE = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=TaskImageOut, status_code=201)
async def upload_task_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "moderator", "founder")),
):
    if file.content_type not in EXT_BY_CONTENT_TYPE:
        raise HTTPException(
            status_code=400,
            detail="Разрешены только изображения (png/jpeg/gif/webp)",
        )
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Файл больше 5 МБ")
    if not data:
        raise HTTPException(status_code=400, detail="Пустой файл")

    img = crud_task_image.create_task_image(db, content_type=file.content_type, size=len(data))
    filename = f"{img.id}{EXT_BY_CONTENT_TYPE[file.content_type]}"

    with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
        f.write(data)

    img = crud_task_image.set_filename(db, img, filename)
    return img


@router.get("/{image_id}")
def get_task_image_file(image_id: int, db: Session = Depends(get_db)):
    img = crud_task_image.get_task_image(db, image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Картинка не найдена")
    path = os.path.join(UPLOAD_DIR, img.filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Файл картинки отсутствует на диске")
    return FileResponse(path, media_type=img.content_type)
