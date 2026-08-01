# app/seed.py
"""
Наполняет пустую базу стартовым набором задач при первом запуске проекта.
Идемпотентно: если в таблице tasks уже что-то есть, ничего не делает.
"""
from sqlalchemy.orm import Session

from app.models.source import Source
from app.models.topic import Topic
from app.models.subtopic import Subtopic
from app.models.task import Task
from app.seed_data import SOURCES, TOPICS, TASKS


def seed_if_empty(db: Session) -> None:
    if db.query(Task.id).first() is not None:
        return

    source_by_key = {}
    for key, fields in SOURCES.items():
        source = Source(**fields)
        db.add(source)
        db.flush()
        source_by_key[key] = source

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
            text=item["text"],
            difficulty=item["difficulty"],
            grade=item.get("grade"),
            source_id=source_by_key[item["source_key"]].id,
        )
        db.add(task)
        db.flush()

        task.topics.append(topic_by_name[item["topic"]])

        subtopic_key = (item["topic"], item.get("subtopic"))
        if subtopic_key in subtopic_by_key:
            task.subtopics.append(subtopic_by_key[subtopic_key])

    db.commit()
