# backend/scripts/sync_tasks.py
"""
Идемпотентная синхронизация app/seed_data.py с уже наполненной БД (прод).

В отличие от app/seed.py (который наполняет только пустую БД при первом
запуске), этот скрипт можно безопасно запускать многократно поверх уже
существующих данных:
  - описания источников (Source.description) обновляются, если изменились
    в seed_data.py — остальные поля источника не трогаются;
  - авторы/темы/подтемы ищутся по имени, создаются только если их ещё нет
    (в норме к моменту запуска они уже должны существовать — на них
    ссылаются существующие задачи);
  - задачи добавляются только если в БД ещё нет задачи с тем же
    title + year + source_id — это и есть дедупликация от повторного
    запуска или частичного пересечения с уже загруженными данными.

Запускать из backend/ (там лежит .env с DATABASE_URL):
    python scripts/sync_tasks.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.source import Source
from app.models.topic import Topic
from app.models.subtopic import Subtopic
from app.models.author import Author
from app.models.task import Task
from app.models.task_image import TaskImage
from app.seed_data import SOURCES, AUTHORS, TOPICS, TASKS
from app.services.task_images import UPLOAD_DIR

SEED_ASSETS_DIR = "seed_assets"
SEED_ASSETS_DIR_LEGACY = "seed_assets/mao"


def _seed_task_image(db, key, cache):
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


def sync(db, dry_run: bool = False) -> None:
    source_by_key = {}
    for key, fields in SOURCES.items():
        src = db.query(Source).filter(Source.name == fields["name"]).first()
        if src is None:
            src = Source(**fields)
            db.add(src)
            db.flush()
            print(f"  + создан источник {fields['name']!r}")
        else:
            new_desc = fields.get("description")
            if new_desc is not None and src.description != new_desc:
                src.description = new_desc
                print(f"  ~ обновлено описание источника {fields['name']!r}")
        source_by_key[key] = src

    author_by_key = {}
    for key, name in AUTHORS.items():
        a = db.query(Author).filter(Author.name == name).first()
        if a is None:
            a = Author(name=name)
            db.add(a)
            db.flush()
            print(f"  + создан автор {name!r}")
        author_by_key[key] = a

    topic_by_name = {}
    subtopic_by_key = {}
    for topic_name, subtopic_names in TOPICS.items():
        t = db.query(Topic).filter(Topic.name == topic_name).first()
        if t is None:
            raise RuntimeError(f"тема отсутствует в БД: {topic_name!r} (ожидалась)")
        topic_by_name[topic_name] = t
        for sn in subtopic_names:
            st = (
                db.query(Subtopic)
                .filter(Subtopic.name == sn, Subtopic.topic_id == t.id)
                .first()
            )
            if st is None:
                raise RuntimeError(f"подтема отсутствует в БД: {topic_name!r} / {sn!r}")
            subtopic_by_key[(topic_name, sn)] = st

    image_cache: dict = {}
    added = 0
    skipped = 0

    for item in TASKS:
        title = item.get("title")
        year = item["year"]
        source = source_by_key[item["source_key"]]

        exists = (
            db.query(Task.id)
            .filter(Task.title == title, Task.year == year, Task.source_id == source.id)
            .first()
        )
        if exists:
            skipped += 1
            continue

        text = item["text"]
        image_ids = [_seed_task_image(db, key, image_cache) for key in item.get("images", [])]
        for image_id in image_ids:
            text += f"\n[[img:{image_id}|width=0.7]]"

        task = Task(
            title=title,
            text=text,
            solution=item.get("solution"),
            answer=item.get("answer"),
            difficulty=item["difficulty"],
            grades=item.get("grades") or [item["grade"]],
            year=year,
            source_id=source.id,
        )
        db.add(task)
        db.flush()

        if image_ids:
            db.query(TaskImage).filter(TaskImage.id.in_(image_ids)).update(
                {"task_id": task.id}, synchronize_session=False
            )

        task.topics.append(topic_by_name[item["topic"]])

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

        added += 1

    if dry_run:
        db.rollback()
        print(f"[dry-run, откачено] Добавлено бы: {added}. Уже было (пропущено): {skipped}.")
    else:
        db.commit()
        print(f"Готово. Добавлено новых задач: {added}. Уже было (пропущено): {skipped}.")


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    db = SessionLocal()
    try:
        sync(db, dry_run=dry_run)
    finally:
        db.close()
