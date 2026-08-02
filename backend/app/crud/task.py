# backend/app/crud/task.py
from typing import List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.task import Task
from app.models.topic import Topic
from app.models.subtopic import Subtopic
from app.models.source import Source
from app.models.author import Author
from app.models.user import User
from app.schemas.task import TaskCreate


SORTABLE_FIELDS = {
    "difficulty": Task.difficulty,
    "year": Task.year,
    "created_at": Task.created_at,
    "author": Author.name,
}


def get_all_tasks(
    db: Session,
    search: Optional[str] = None,          # поиск по тексту условия задачи
    sources: Optional[List[str]] = None,   # названия олимпиад (Source.name)
    grades: Optional[List[int]] = None,    # классы (Task.grade)
    topic_ids: Optional[List[int]] = None,
    subtopic_ids: Optional[List[int]] = None,
    author_ids: Optional[List[int]] = None,
    difficulty_min: Optional[int] = None,
    difficulty_max: Optional[int] = None,
    difficulties: Optional[List[int]] = None,   # конкретные значения сложности (напр. 1, 3, 6)
    year_min: Optional[int] = None,        # диапазон года олимпиады (Task.year)
    year_max: Optional[int] = None,
    years: Optional[List[int]] = None,     # конкретные годы олимпиады
    sort_by: Optional[str] = None,         # "difficulty" | "year" | "created_at" | "author"
    sort_dir: str = "asc",                 # "asc" | "desc"
):
    """
    Возвращает задачи с возможными фильтрами.
    Все фильтры безопасно комбинируются; связки джоиним по relationships.
    """
    query = (
        db.query(Task)
        .options(
            joinedload(Task.source),
            joinedload(Task.author),
            joinedload(Task.topics),
            joinedload(Task.subtopics),
        )
    )

    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.filter(or_(Task.text.ilike(pattern), Task.title.ilike(pattern)))

    if sources:
        query = query.join(Task.source).filter(Source.name.in_(sources))

    needs_author_join = bool(author_ids or sort_by == "author")
    if needs_author_join:
        # LEFT JOIN — у задачи автор необязателен (author_id nullable),
        # обычный join потерял бы все задачи без автора при сортировке
        query = query.join(Task.author, isouter=True)

    # --- фильтр по конкретным годам олимпиады (приоритетнее диапазона; атрибут задачи) ---
    if years:
        query = query.filter(Task.year.in_(years))
    else:
        # --- фильтр по диапазону годов олимпиады ---
        if year_min is not None:
            query = query.filter(Task.year >= year_min)

        if year_max is not None:
            query = query.filter(Task.year <= year_max)

    # --- фильтр по классу (атрибут самой задачи) ---
    if grades:
        query = query.filter(Task.grade.in_(grades))

    # --- фильтры по темам/подтемам через relationships ---
    if topic_ids:
        query = query.join(Task.topics).filter(Topic.id.in_(topic_ids))

    if subtopic_ids:
        query = query.join(Task.subtopics).filter(Subtopic.id.in_(subtopic_ids))

    # --- фильтр по автору ---
    if author_ids:
        query = query.filter(Author.id.in_(author_ids))

    # --- фильтр по конкретным значениям сложности (приоритетнее диапазона) ---
    if difficulties:
        query = query.filter(Task.difficulty.in_(difficulties))
    else:
        # --- фильтр по диапазону сложности ---
        if difficulty_min is not None:
            query = query.filter(Task.difficulty >= difficulty_min)

        if difficulty_max is not None:
            query = query.filter(Task.difficulty <= difficulty_max)

    # возможны дубли из-за нескольких JOIN'ов
    query = query.distinct()

    # --- сортировка ---
    sort_column = SORTABLE_FIELDS.get(sort_by, Task.created_at)
    query = query.order_by(sort_column.desc() if sort_dir == "desc" else sort_column.asc())

    return query.all()


def get_distinct_years(db: Session) -> List[int]:
    """Уникальные годы олимпиады (Task.year) среди существующих задач, без учёта фильтров."""
    rows = db.query(Task.year).distinct().all()
    return sorted(r[0] for r in rows if r[0] is not None)


def get_task(db: Session, task_id: int):
    return (
        db.query(Task)
        .options(
            joinedload(Task.source),
            joinedload(Task.author),
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
        title=task.title,
        text=task.text,
        solution=task.solution,
        answer=task.answer,
        difficulty=task.difficulty,
        grade=task.grade,
        year=task.year,
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


def get_tasks_by_ids(db: Session, task_ids: List[int]):
    """Возвращает задачи по списку id — используется экспортом выбранных задач в TeX/PDF."""
    if not task_ids:
        return []
    return (
        db.query(Task)
        .options(
            joinedload(Task.source),
            joinedload(Task.author),
            joinedload(Task.topics),
            joinedload(Task.subtopics),
        )
        .filter(Task.id.in_(task_ids))
        .all()
    )
