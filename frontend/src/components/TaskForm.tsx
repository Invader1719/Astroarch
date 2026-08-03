import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

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
  author_ids: number[];
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
  authorIds?: number[];
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

type ImageField = "text" | "solution" | "answer";

export default function TaskForm({ heading, submitLabel, initial, onSubmit }: Props) {
  const { token: authToken } = useAuth();

  // поля формы
  const [title, setTitle] = useState(initial?.title ?? "");
  const [text, setText] = useState(initial?.text ?? "");
  const [solution, setSolution] = useState(initial?.solution ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");

  // вставка картинок в текст/решение/ответ — по кнопке рядом с полем,
  // сама картинка сразу грузится на сервер, в текст вставляется токен
  // [[img:ID|width=0.7]] в позицию курсора (см. app/services/task_images.py)
  const textRef = useRef<HTMLTextAreaElement>(null);
  const solutionRef = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLInputElement>(null);
  const fileInputRefs = {
    text: useRef<HTMLInputElement>(null),
    solution: useRef<HTMLInputElement>(null),
    answer: useRef<HTMLInputElement>(null),
  };
  const [uploadingField, setUploadingField] = useState<ImageField | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const insertAtCursor = (
    el: HTMLTextAreaElement | HTMLInputElement | null,
    value: string,
    setValue: (v: string) => void,
    token: string
  ) => {
    if (!el) {
      setValue(value + token);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleImageUpload = async (
    field: ImageField,
    file: File,
    el: HTMLTextAreaElement | HTMLInputElement | null,
    value: string,
    setValue: (v: string) => void
  ) => {
    setUploadError(null);
    setUploadingField(field);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/task-images/", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Ошибка загрузки: ${res.status}`);
      }
      const data = await res.json();
      insertAtCursor(el, value, setValue, `[[img:${data.id}|width=0.7]]`);
    } catch (e: any) {
      setUploadError(e.message || "Не удалось загрузить картинку");
    } finally {
      setUploadingField(null);
    }
  };
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 1);
  const [grade, setGrade] = useState<number | "">(initial?.grade ?? "");
  const [sourceId, setSourceId] = useState<number | "">(initial?.sourceId ?? "");
  const [authorIds, setAuthorIds] = useState<number[]>(initial?.authorIds ?? []);
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
        author_ids: authorIds,
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

        {uploadError && <p className="text-red-400 text-sm">{uploadError}</p>}

        {/* Условие */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={"font-semibold text-white"}>Условие</label>
            <button
              type="button"
              onClick={() => fileInputRefs.text.current?.click()}
              disabled={uploadingField === "text"}
              className="text-xs px-2 py-1 rounded border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition disabled:opacity-50"
            >
              {uploadingField === "text" ? "Загружаем..." : "🖼 Вставить картинку"}
            </button>
            <input
              ref={fileInputRefs.text}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload("text", file, textRef.current, text, setText);
                e.target.value = "";
              }}
            />
          </div>
          <textarea
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={inputClass}
            rows={4}
            required
          />
        </div>

        {/* Решение */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={"font-semibold text-white"}>Решение (необязательно)</label>
            <button
              type="button"
              onClick={() => fileInputRefs.solution.current?.click()}
              disabled={uploadingField === "solution"}
              className="text-xs px-2 py-1 rounded border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition disabled:opacity-50"
            >
              {uploadingField === "solution" ? "Загружаем..." : "🖼 Вставить картинку"}
            </button>
            <input
              ref={fileInputRefs.solution}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload("solution", file, solutionRef.current, solution, setSolution);
                e.target.value = "";
              }}
            />
          </div>
          <textarea
            ref={solutionRef}
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            className={inputClass}
            rows={3}
          />
        </div>

        {/* Ответ */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={"font-semibold text-white"}>Ответ (необязательно)</label>
            <button
              type="button"
              onClick={() => fileInputRefs.answer.current?.click()}
              disabled={uploadingField === "answer"}
              className="text-xs px-2 py-1 rounded border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition disabled:opacity-50"
            >
              {uploadingField === "answer" ? "Загружаем..." : "🖼 Вставить картинку"}
            </button>
            <input
              ref={fileInputRefs.answer}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload("answer", file, answerRef.current, answer, setAnswer);
                e.target.value = "";
              }}
            />
          </div>
          <input
            ref={answerRef}
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

        {/* Авторы — можно выбрать нескольких (соавторство) */}
        <div>
          <label className={labelClass}>Авторы (необязательно)</label>
          {authors.length === 0 ? (
            <p className="text-sm text-white/50 italic">Список авторов пуст</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {authors.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => toggleArrayValue(a.id, authorIds, setAuthorIds)}
                  className={`px-3 py-1.5 rounded-full border text-sm font-medium transition ${
                    authorIds.includes(a.id)
                      ? "bg-blue-500 border-blue-400 text-white"
                      : "bg-zinc-900 border-white/20 text-white/70 hover:text-white hover:border-white/40"
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          )}
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
