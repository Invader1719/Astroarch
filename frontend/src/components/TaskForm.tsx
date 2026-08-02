import { useState, useEffect } from "react";

type Source = { id: number; name: string };
type Topic = { id: number; name: string };
type Subtopic = { id: number; name: string; topic_id: number };
type Author = { id: number; name: string };

export type TaskPayload = {
  title: string | null;
  text: string;
  solution: string | null;
  answer: string | null;
  difficulty: number;
  grade: number;
  year: number;
  source_id: number;
  author_id: number | null;
  topic_ids: number[];
  subtopic_ids: number[];
};

export type TaskFormInitial = {
  title?: string;
  text?: string;
  solution?: string;
  answer?: string;
  difficulty?: number;
  grade?: number | "";
  year?: number | "";
  sourceId?: number | "";
  authorId?: number | "";
  topicIds?: number[];
  subtopicIds?: number[];
};

type Props = {
  heading: string;
  submitLabel: string;
  initial?: TaskFormInitial;
  onSubmit: (payload: TaskPayload) => Promise<void>;
};

const inputClass =
  "w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2 focus:outline-none focus:border-blue-400";
const labelClass = "block mb-1 font-semibold text-white";

export default function TaskForm({ heading, submitLabel, initial, onSubmit }: Props) {
  // поля формы
  const [title, setTitle] = useState(initial?.title ?? "");
  const [text, setText] = useState(initial?.text ?? "");
  const [solution, setSolution] = useState(initial?.solution ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 1);
  const [grade, setGrade] = useState<number | "">(initial?.grade ?? "");
  const [sourceId, setSourceId] = useState<number | "">(initial?.sourceId ?? "");
  const [authorId, setAuthorId] = useState<number | "">(initial?.authorId ?? "");
  const [topicIds, setTopicIds] = useState<number[]>(initial?.topicIds ?? []);
  const [subtopicIds, setSubtopicIds] = useState<number[]>(initial?.subtopicIds ?? []);

  // справочники
  const [sources, setSources] = useState<Source[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [allYears, setAllYears] = useState<number[]>([]);

  // год — единственное поле, для которого можно ввести совсем новое значение
  // прямо здесь; источник/тема/подтема/автор создаются только в админ-панели
  const [year, setYear] = useState<number | "">(initial?.year ?? "");
  const [showNewYear, setShowNewYear] = useState(false);
  const [newYear, setNewYear] = useState<number | "">("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // подгрузка справочников — ВАЖНО: все урлы со слэшем
  useEffect(() => {
    Promise.all([
      fetch("/api/sources/").then(r => r.json()),
      fetch("/api/topics/").then(r => r.json()),
      fetch("/api/subtopics/").then(r => r.json()),
      fetch("/api/authors/").then(r => r.json()),
      fetch("/api/tasks/years/").then(r => r.json()),
    ])
      .then(([srcs, tps, stps, auths, years]) => {
        setSources(srcs ?? []);
        setTopics(tps ?? []);
        setSubtopics(stps ?? []);
        setAuthors(auths ?? []);
        setAllYears(years ?? []);
      })
      .catch((e) => {
        console.error("Ошибка загрузки справочников:", e);
        setError("Не удалось загрузить источники/темы/подтемы/авторов.");
      });
  }, []);

  // helper для чекбоксов
  const toggleArrayValue = <T,>(value: T, arr: T[], setter: (val: T[]) => void) => {
    setter(arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]);
  };

  // сбрасываем неподходящие подтемы при изменении тем
  useEffect(() => {
    setSubtopicIds(prev =>
      prev.filter(id => {
        const st = subtopics.find(s => s.id === id);
        return st ? topicIds.includes(st.topic_id) : false;
      })
    );
  }, [topicIds, subtopics]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!text.trim()) throw new Error("Введите условие задачи");
      if (sourceId === "") throw new Error("Выберите источник");
      if (grade === "") throw new Error("Укажите класс");
      const finalYear = showNewYear ? newYear : year;
      if (finalYear === "") throw new Error("Укажите год олимпиады");

      const payload: TaskPayload = {
        title: title.trim() || null,
        text,
        solution: solution || null,
        answer: answer || null,
        difficulty: Number(difficulty),
        grade: Number(grade),
        year: Number(finalYear),
        source_id: Number(sourceId),
        author_id: authorId === "" ? null : Number(authorId),
        topic_ids: topicIds,
        subtopic_ids: subtopicIds,
      };

      await onSubmit(payload);
    } catch (err: any) {
      setError(err.message || "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 mb-10 p-6 bg-white/10 border border-white/20 rounded-lg backdrop-blur-md">
      <h1 className="text-2xl font-bold mb-4 text-white">{heading}</h1>
      {error && <p className="text-red-400 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Название */}
        <div>
          <label className={labelClass}>Название (необязательно)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="например: Улетающая звезда"
            className={inputClass}
          />
        </div>

        {/* Условие */}
        <div>
          <label className={labelClass}>Условие</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={inputClass}
            rows={4}
            required
          />
        </div>

        {/* Решение */}
        <div>
          <label className={labelClass}>Решение (необязательно)</label>
          <textarea
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            className={inputClass}
            rows={3}
          />
        </div>

        {/* Ответ */}
        <div>
          <label className={labelClass}>Ответ (необязательно)</label>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Сложность и Класс — в один ряд */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Сложность</label>
            <input
              type="number"
              min={1}
              max={10}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Класс</label>
            <input
              type="number"
              min={1}
              max={11}
              value={grade}
              onChange={(e) => setGrade(e.target.value ? Number(e.target.value) : "")}
              className={inputClass}
              required
            />
          </div>
        </div>

        {/* Источник */}
        <div>
          <label className={labelClass}>Источник (олимпиада)</label>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value ? Number(e.target.value) : "")}
            className={inputClass}
            required
          >
            <option value="">Выберите источник</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-white/50">
            Нет нужного источника? Добавить новый может только администратор — в панели администратора.
          </p>
        </div>

        {/* Год олимпиады */}
        <div>
          <label className={labelClass}>Год олимпиады</label>
          {!showNewYear ? (
            <>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
                className={inputClass}
                required={!showNewYear}
              >
                <option value="">Выберите год</option>
                {allYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => { setShowNewYear(true); setYear(""); }}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition"
              >
                + Новый год (нет в списке)
              </button>
            </>
          ) : (
            <>
              <input
                type="number"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value ? Number(e.target.value) : "")}
                placeholder="например: 2025"
                className={inputClass}
                required={showNewYear}
              />
              <button
                type="button"
                onClick={() => { setShowNewYear(false); setNewYear(""); }}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition"
              >
                − Выбрать существующий год
              </button>
            </>
          )}
        </div>

        {/* Автор */}
        <div>
          <label className={labelClass}>Автор (необязательно)</label>
          <select
            value={authorId}
            onChange={(e) => setAuthorId(e.target.value ? Number(e.target.value) : "")}
            className={inputClass}
          >
            <option value="">Не указывать автора</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        {/* Темы */}
        <div>
          <label className={labelClass}>Темы</label>
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => toggleArrayValue(t.id, topicIds, setTopicIds)}
                className={`px-3 py-1.5 rounded-full border text-sm font-medium transition ${
                  topicIds.includes(t.id)
                    ? "bg-blue-500 border-blue-400 text-white"
                    : "bg-zinc-900 border-white/20 text-white/70 hover:text-white hover:border-white/40"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Подтемы */}
        <div>
          <label className={labelClass}>Подтемы</label>
          {topicIds.length === 0 ? (
            <p className="text-sm text-white/50 italic">Выберите тему</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subtopics
                .filter((st) => topicIds.includes(st.topic_id))
                .map((st) => (
                  <button
                    type="button"
                    key={st.id}
                    onClick={() => toggleArrayValue(st.id, subtopicIds, setSubtopicIds)}
                    className={`px-3 py-1.5 rounded-full border text-sm font-medium transition ${
                      subtopicIds.includes(st.id)
                        ? "bg-blue-500 border-blue-400 text-white"
                        : "bg-zinc-900 border-white/20 text-white/70 hover:text-white hover:border-white/40"
                    }`}
                  >
                    {st.name}
                  </button>
                ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 disabled:opacity-60 font-semibold transition"
        >
          {loading ? "Сохраняем..." : submitLabel}
        </button>
      </form>
    </div>
  );
}
