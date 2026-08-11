from sqlalchemy.orm import Session
from app.models.source import Source
from app.models.task import Task


def _compress_int_ranges(nums: list[int]) -> list[tuple[int, int]]:
    """[9, 10, 11, 20] -> [(9, 11), (20, 20)]"""
    if not nums:
        return []
    nums = sorted(set(nums))
    ranges = []
    start = prev = nums[0]
    for n in nums[1:]:
        if n == prev + 1:
            prev = n
            continue
        ranges.append((start, prev))
        start = prev = n
    ranges.append((start, prev))
    return ranges


def _format_range(a: int, b: int) -> str:
    return str(a) if a == b else f"{a}–{b}"


def _format_ranges(nums: list[int]) -> str:
    return ", ".join(_format_range(a, b) for a, b in _compress_int_ranges(nums))


def get_source_coverage(db: Session) -> list[dict]:
    """Для каждого источника — по каким годам реально есть задачи (и какие
    классы в каждом году), сгруппированное в текстовые диапазоны, плюс
    отдельно пропуски внутри диапазона годов. Считается на лету из
    Task/Source — никакого отдельного хранилища прогресса не нужно."""
    sources = db.query(Source).order_by(Source.id).all()
    result = []

    for source in sources:
        rows = db.query(Task.year, Task.grades).filter(Task.source_id == source.id).all()

        year_grades: dict[int, set[int]] = {}
        for year, grades in rows:
            year_grades.setdefault(year, set()).update(grades or [])

        total_tasks = len(rows)

        if not year_grades:
            result.append(
                {
                    "source_id": source.id,
                    "name": source.name,
                    "total_tasks": 0,
                    "present_text": "",
                    "missing_text": "",
                }
            )
            continue

        years_sorted = sorted(year_grades.keys())

        # группируем подряд идущие годы с одинаковым набором классов в один сегмент
        segments: list[tuple[int, int, set[int]]] = []
        seg_start = seg_end = years_sorted[0]
        seg_grades = year_grades[seg_start]
        for y in years_sorted[1:]:
            if y == seg_end + 1 and year_grades[y] == seg_grades:
                seg_end = y
                continue
            segments.append((seg_start, seg_end, seg_grades))
            seg_start = seg_end = y
            seg_grades = year_grades[y]
        segments.append((seg_start, seg_end, seg_grades))

        present_parts = []
        for a, b, grades in segments:
            year_part = _format_range(a, b)
            grade_part = _format_ranges(sorted(grades))
            present_parts.append(f"{year_part} ({grade_part} класс)")
        present_text = "; ".join(present_parts)

        missing_years = [y for y in range(years_sorted[0], years_sorted[-1] + 1) if y not in year_grades]
        missing_text = _format_ranges(missing_years)

        result.append(
            {
                "source_id": source.id,
                "name": source.name,
                "total_tasks": total_tasks,
                "present_text": present_text,
                "missing_text": missing_text,
            }
        )

    return result
