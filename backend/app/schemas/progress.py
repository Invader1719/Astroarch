from pydantic import BaseModel


class SourceCoverageOut(BaseModel):
    source_id: int
    name: str
    total_tasks: int
    present_text: str  # напр. "1994–2003 (8–11 класс); 2004–2009 (9–11 класс)"
    missing_text: str  # напр. "2010–2017, 2020" (пусто, если пропусков нет)
