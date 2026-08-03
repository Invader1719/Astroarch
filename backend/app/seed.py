# app/seed.py
"""
Наполняет пустую базу стартовым набором задач при первом запуске проекта.
Идемпотентно: если в таблице tasks уже что-то есть, ничего не делает.
"""
from sqlalchemy.orm import Session

from app.models.source import Source
from app.models.topic import Topic
from app.models.subtopic import Subtopic
from app.models.author import Author
from app.models.task import Task
from app.seed_data import SOURCES, AUTHORS, TOPICS, TASKS


def seed_if_empty(db: Session) -> None:
    if db.query(Task.id).first() is not None:
        return

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
        topic = Topic(name=topic_name)
        db.add(topic)
        db.flush()
        topic_by_name[topic_name] = topic

        for subtopic_name in subtopic_names:
            subtopic = Subtopic(name=subtopic_name, topic_id=topic.id)
            db.add(subtopic)
            db.flush()
            subtopic_by_key[(topic_name, subtopic_name)] = subtopic

    for item in TASKS:
        task = Task(
            title=item.get("title"),
            text=item["text"],
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
