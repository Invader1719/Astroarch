# backend/app/crud/task.py
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload

from app.models.task import Task
from app.models.topic import Topic
from app.models.subtopic import Subtopic
from app.models.source import Source
from app.models.user import User
from app.schemas.task import TaskCreate


def get_all_tasks(
    db: Session,
    year: Optional[int] = None,
    sources: Optional[List[str]] = None,   # названия олимпиад (Source.name)
    grades: Optional[List[int]] = None,    # классы (Source.grade)
    topic_ids: Optional[List[int]] = None,
    subtopic_ids: Optional[List[int]] = None,
):
    """
    Возвращает задачи с возможными фильтрами.
    Все фильтры безопасно комбинируются; связки джоиним по relationships.
    """
    query = (
        db.query(Task)
        .options(
            joinedload(Task.source),
            joinedload(Task.topics),
            joinedload(Task.subtopics),
        )
    )

    # --- фильтры по источнику (олимпиада/год/класс) ---
    if sources:
        query = query.join(Task.source).filter(Source.name.in_(sources))

    if year is not None:
        query = query.join(Task.source).filter(Source.year == year)

    if grades:
        query = query.join(Task.source).filter(Source.grade.in_(grades))

    # --- фильтры по темам/подтемам через relationships ---
    if topic_ids:
        query = query.join(Task.topics).filter(Topic.id.in_(topic_ids))

    if subtopic_ids:
        query = query.join(Task.subtopics).filter(Subtopic.id.in_(subtopic_ids))

    # возможны дубли из-за нескольких JOIN'ов
    query = query.distinct()

    return query.all()


def get_task(db: Session, task_id: int):
    return (
        db.query(Task)
        .options(
            joinedload(Task.source),
            joinedload(Task.topics),
            joinedload(Task.subtopics),
        )
        .filter(Task.id == task_id)
        .first()
    )


def create_task(db: Session, task: TaskCreate, user_id: int):
    """
    Создаёт задачу. Видимый автор (author_id) — опционален.
    created_by_user_id — внутренний автор (кто добавил в БД).
    """
    db_task = Task(
        text=task.text,
        solution=task.solution,
        answer=task.answer,
        difficulty=task.difficulty,
        source_id=task.source_id,
        author_id=getattr(task, "author_id", None),
        created_by_user_id=user_id,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    # привязка тем/подтем
    if task.topic_ids:
        topics = db.query(Topic).filter(Topic.id.in_(task.topic_ids)).all()
        db_task.topics.extend(topics)

    if task.subtopic_ids:
        subs = db.query(Subtopic).filter(Subtopic.id.in_(task.subtopic_ids)).all()
        db_task.subtopics.extend(subs)

    # Начисляем люмину
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        try:
            lumina_add = 0
            if task.text and task.text.strip():
                lumina_add += 3
            if task.solution and task.solution.strip():
                lumina_add += 5
            if task.answer and task.answer.strip():
                lumina_add += 2
            if lumina_add:
                user.lumina += lumina_add
                db.add(user)
        except Exception as e:
            # логируем, но не валим создание задачи
            print("Ошибка начисления люмин:", e)

    db.commit()
    db.refresh(db_task)
    return db_task


def get_tasks_for_export(db: Session, filters: Optional[Dict[str, Any]] = None):
    """
    Возвращает список задач для экспорта в PDF/TeX.
    filters — словарь с возможными ключами:
        year, source_id, topic_id, subtopic_id, difficulty
    """
    query = db.query(Task)

    if filters:
        # год — это поле источника
        if filters.get("year") is not None:
            query = query.join(Task.source).filter(Source.year == filters["year"])

        if filters.get("source_id") is not None:
            query = query.filter(Task.source_id == filters["source_id"])

        if filters.get("topic_id") is not None:
            query = query.join(Task.topics).filter(Topic.id == filters["topic_id"])

        if filters.get("subtopic_id") is not None:
            query = query.join(Task.subtopics).filter(
                Subtopic.id == filters["subtopic_id"]
            )

        if filters.get("difficulty") is not None:
            query = query.filter(Task.difficulty == filters["difficulty"])

    return query.distinct().all()
