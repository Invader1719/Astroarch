# app/seed.py
"""
Наполняет пустую базу стартовым набором задач при первом запуске проекта.
Идемпотентно: если в таблице tasks уже что-то есть, ничего не делает.
"""
import os

from sqlalchemy.orm import Session

from app.models.source import Source
from app.models.topic import Topic
from app.models.subtopic import Subtopic
from app.models.author import Author
from app.models.task import Task
from app.models.task_image import TaskImage
from app.seed_data import SOURCES, AUTHORS, TOPICS, TOPIC_DESCRIPTIONS, TASKS
from app.services.task_images import UPLOAD_DIR

# Картинки задач-сидов лежат рядом с backend/ (не в uploads/ — тот не
# коммитится в git); при пересоздании БД восстанавливаем их отсюда.
# Старые (МАО) картинки лежат в seed_assets/mao/, новые — прямо в
# seed_assets/; при поиске пробуем оба места.
SEED_ASSETS_DIR = "seed_assets"
SEED_ASSETS_DIR_LEGACY = "seed_assets/mao"


def _seed_task_image(db: Session, key: str, cache: dict) -> int:
    """Создаёт TaskImage из файла seed_assets/<key>.png (или, для старых
    записей, seed_assets/mao/<key>.png), копирует его в uploads/task_images
    и возвращает id — идемпотентно в рамках одного прогона."""
    if key in cache:
        return cache[key]
    src_path = os.path.join(SEED_ASSETS_DIR, f"{key}.png")
    if not os.path.exists(src_path):
        src_path = os.path.join(SEED_ASSETS_DIR_LEGACY, f"{key}.png")
    with open(src_path, "rb") as f:
        data = f.read()
    img = TaskImage(filename="", content_type="image/png", size=len(data))
    db.add(img)
    db.flush()
    filename = f"{img.id}.png"
    with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
        f.write(data)
    img.filename = filename
    db.flush()
    cache[key] = img.id
    return img.id


def seed_if_empty(db: Session) -> None:
    if db.query(Task.id).first() is not None:
        return

    image_cache: dict = {}

    source_by_key = {}
    for key, fields in SOURCES.items():
        source = Source(**fields)
        db.add(source)
        db.flush()
        source_by_key[key] = source

    author_by_key = {}
    for key, name in AUTHORS.items():
        author = Author(name=name)
        db.add(author)
        db.flush()
        author_by_key[key] = author

    topic_by_name = {}
    subtopic_by_key = {}
    for topic_name, subtopic_names in TOPICS.items():
        topic = Topic(name=topic_name, description=TOPIC_DESCRIPTIONS.get(topic_name))
        db.add(topic)
        db.flush()
        topic_by_name[topic_name] = topic

        for subtopic_name in subtopic_names:
            subtopic = Subtopic(name=subtopic_name, topic_id=topic.id)
            db.add(subtopic)
            db.flush()
            subtopic_by_key[(topic_name, subtopic_name)] = subtopic

    for item in TASKS:
        text = item["text"]
        image_ids = [_seed_task_image(db, key, image_cache) for key in item.get("images", [])]
        for image_id in image_ids:
            text += f"\n[[img:{image_id}|width=0.7]]"

        task = Task(
            title=item.get("title"),
            text=text,
            solution=item.get("solution"),
            answer=item.get("answer"),
            difficulty=item["difficulty"],
            # сквозные задачи — item["grades"] (список) или старое единственное
            # число item["grade"] для обратной совместимости с seed_data.py
            grades=item.get("grades") or [item["grade"]],
            year=item["year"],
            source_id=source_by_key[item["source_key"]].id,
        )
        db.add(task)
        db.flush()

        if image_ids:
            db.query(TaskImage).filter(TaskImage.id.in_(image_ids)).update(
                {"task_id": task.id}, synchronize_session=False
            )

        task.topics.append(topic_by_name[item["topic"]])

        # авторы — item["author_keys"] (список, соавторство) или старое
        # единственное число item["author_key"] для обратной совместимости
        author_keys = item.get("author_keys")
        if author_keys is None:
            single = item.get("author_key")
            author_keys = [single] if single else []
        for author_key in author_keys:
            task.authors.append(author_by_key[author_key])

        subtopic_names = item.get("subtopics")
        if subtopic_names is None:
            subtopic_names = [item["subtopic"]] if item.get("subtopic") else []
        for subtopic_name in subtopic_names:
            subtopic_key = (item["topic"], subtopic_name)
            if subtopic_key in subtopic_by_key:
                task.subtopics.append(subtopic_by_key[subtopic_key])

    db.commit()
