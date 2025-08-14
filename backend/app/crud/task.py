from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.topic import Topic
from app.models.subtopic import Subtopic
from app.schemas.task import TaskCreate
from app.models.user import User
from sqlalchemy.orm import joinedload

def get_all_tasks(db, year: int = None, sources: list[str] = None, grades: list[int] = None,
                  topic_ids: list[int] = None, subtopic_ids: list[int] = None):
    query = (
        db.query(Task)
        .options(
            joinedload(Task.source),
            joinedload(Task.topics),
            joinedload(Task.subtopics)
        )
    )

    if year is not None:
        query = query.join(Task.source).filter(Source.year == year)

    if sources:
        query = query.join(Task.source).filter(Source.name.in_(sources))

    if grades:
        query = query.join(Task.source).filter(Source.grade.in_(grades))

    if topic_ids:
        query = query.join(task_topic).filter(task_topic.c.topic_id.in_(topic_ids))

    if subtopic_ids:
        query = query.join(task_subtopic).filter(task_subtopic.c.subtopic_id.in_(subtopic_ids))

    return query.all()


def get_task(db, task_id: int):
    return (
        db.query(Task)
        .options(
            joinedload(Task.source),
            joinedload(Task.topics),
            joinedload(Task.subtopics)
        )
        .filter(Task.id == task_id)
        .first()
    )

def create_task(db: Session, task: TaskCreate, user_id: int):
    db_task = Task(
        text=task.text,
        solution=task.solution,
        answer=task.answer,
        difficulty=task.difficulty,
        source_id=task.source_id,
        author_id=task.author_id,           # ← видимый автор задачи (из справочника)
        created_by_user_id=user_id          # ← внутренний автор (кто добавил в БД)
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    if task.topic_ids:
        topics = db.query(Topic).filter(Topic.id.in_(task.topic_ids)).all()
        db_task.topics.extend(topics)

    if task.subtopic_ids:
        subtopics = db.query(Subtopic).filter(Subtopic.id.in_(task.subtopic_ids)).all()
        db_task.subtopics.extend(subtopics)

    # Начисляем Люмину
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
            print("Ошибка начисления люмин:", e)

    print("Начисляем люмину для user.id =", user_id)
    db.commit()
    db.refresh(db_task)
    return db_task


def get_tasks_for_export(db: Session, filters: dict = None):
    """
    Возвращает список задач для экспорта в PDF/TeX.
    filters — словарь с возможными ключами:
        year, source_id, topic_id, subtopic_id, difficulty
    """
    query = db.query(Task)

    if filters:
        if "year" in filters and filters["year"] is not None:
            query = query.filter(Task.year == filters["year"])
        if "source_id" in filters and filters["source_id"] is not None:
            query = query.filter(Task.source_id == filters["source_id"])
        if "topic_id" in filters and filters["topic_id"] is not None:
            query = query.join(Task.topics).filter_by(id=filters["topic_id"])
        if "subtopic_id" in filters and filters["subtopic_id"] is not None:
            query = query.join(Task.subtopics).filter_by(id=filters["subtopic_id"])
        if "difficulty" in filters and filters["difficulty"] is not None:
            query = query.filter(Task.difficulty == filters["difficulty"])

    return query.all()
