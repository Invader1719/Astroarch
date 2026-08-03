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
  grades: number[];
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
  grades?: number[];
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
// сквозные задачи — классов может быть несколько сразу
const GRADE_OPTIONS = [5, 6, 7, 8, 9, 10, 11];

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
  const [grades, setGrades] = useState<number[]>(initial?.grades ?? []);
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

  // год — свободное число, отдельная сущность не нужна
  const [year, setYear] = useState<number | "">(initial?.year ?? "");
  const [showNewYear, setShowNewYear] = useState(false);
  const [newYear, setNewYear] = useState<number | "">("");

  // быстрое добавление источника/темы/подтемы/автора прямо из формы —
  // тем же принципом, что и "+ Новый год" (модератор/админ/фаундер, см.
  // require_role в app/api/{source,topic,subtopic,author}.py на бэкенде)
  const [showNewSource, setShowNewSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [creatingSource, setCreatingSource] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);

  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);

  const [showNewSubtopic, setShowNewSubtopic] = useState(false);
  const [newSubtopicName, setNewSubtopicName] = useState("");
  const [newSubtopicTopicId, setNewSubtopicTopicId] = useState<number | "">("");
  const [creatingSubtopic, setCreatingSubtopic] = useState(false);
  const [subtopicError, setSubtopicError] = useState<string | null>(null);

  const [showNewAuthor, setShowNewAuthor] = useState(false);
  const [newAuthorName, setNewAuthorName] = useState("");
  const [creatingAuthor, setCreatingAuthor] = useState(false);
  const [authorError, setAuthorError] = useState<string | null>(null);

  const createReference = async <T,>(
    url: string,
    body: any,
    setCreating: (b: boolean) => void,
    setErr: (e: string | null) => void
  ): Promise<T | null> => {
    setErr(null);
    setCreating(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Ошибка: ${res.status}`);
      }
      return await res.json();
    } catch (e: any) {
      setErr(e.message || "Не удалось создать");
      return null;
    } finally {
      setCreating(false);
    }
  };

  const handleCreateSource = async () => {
    const name = newSourceName.trim();
    if (!name) return;
    const created = await createReference<Source>("/api/sources/", { name }, setCreatingSource, setSourceError);
    if (created) {
      setSources((prev) => [...prev, created]);
      setSourceId(created.id);
      setShowNewSource(false);
      setNewSourceName("");
    }
  };

  const handleCreateTopic = async () => {
    const name = newTopicName.trim();
    if (!name) return;
    const created = await createReference<Topic>("/api/topics/", { name }, setCreatingTopic, setTopicError);
    if (created) {
      setTopics((prev) => [...prev, created]);
      setTopicIds((prev) => [...prev, created.id]);
      setShowNewTopic(false);
      setNewTopicName("");
    }
  };

  const handleCreateSubtopic = async () => {
    const name = newSubtopicName.trim();
    const topicId = newSubtopicTopicId === "" ? topicIds[0] : newSubtopicTopicId;
    if (!name || topicId === undefined) return;
    const created = await createReference<Subtopic>(
      "/api/subtopics/",
      { name, topic_id: topicId },
      setCreatingSubtopic,
      setSubtopicError
    );
    if (created) {
      setSubtopics((prev) => [...prev, created]);
      setSubtopicIds((prev) => [...prev, created.id]);
      setShowNewSubtopic(false);
      setNewSubtopicName("");
    }
  };

  const handleCreateAuthor = async () => {
    const name = newAuthorName.trim();
    if (!name) return;
    const created = await createReference<Author>("/api/authors/", { name }, setCreatingAuthor, setAuthorError);
    if (created) {
      setAuthors((prev) => [...prev, created]);
      setAuthorIds((prev) => [...prev, created.id]);
      setShowNewAuthor(false);
      setNewAuthorName("");
    }
  };

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
      if (grades.length === 0) throw new Error("Укажите хотя бы один класс");
      const finalYear = showNewYear ? newYear : year;
      if (finalYear === "") throw new Error("Укажите год олимпиады");

      const payload: TaskPayload = {
        title: title.trim() || null,
        text,
        solution: solution || null,
        answer: answer || null,
        difficulty: Number(difficulty),
        grades,
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

        {/* Сложность */}
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

        {/* Классы — сквозная задача может относиться сразу к нескольким */}
        <div>
          <label className={labelClass}>Классы</label>
          <div className="flex flex-wrap gap-2">
            {GRADE_OPTIONS.map((g) => (
              <button
                type="button"
                key={g}
                onClick={() => toggleArrayValue(g, grades, setGrades)}
                className={`w-10 h-10 rounded-full border text-sm font-semibold transition ${
                  grades.includes(g)
                    ? "bg-blue-500 border-blue-400 text-white"
                    : "bg-zinc-900 border-white/20 text-white/70 hover:text-white hover:border-white/40"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Источник */}
        <div>
          <label className={labelClass}>Источник (олимпиада)</label>
          {sourceError && <p className="text-red-400 text-sm mb-1">{sourceError}</p>}
          {!showNewSource ? (
            <>
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
              <button
                type="button"
                onClick={() => setShowNewSource(true)}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition"
              >
                + Новый источник (нет в списке)
              </button>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="например: ВсОШ. Закл"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={handleCreateSource}
                  disabled={creatingSource || !newSourceName.trim()}
                  className="shrink-0 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 disabled:opacity-50 transition"
                >
                  {creatingSource ? "..." : "Создать"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setShowNewSource(false); setNewSourceName(""); setSourceError(null); }}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition"
              >
                − Выбрать существующий источник
              </button>
            </>
          )}
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
          {authorError && <p className="text-red-400 text-sm mb-1">{authorError}</p>}
          {authors.length === 0 ? (
            <p className="text-sm text-white/50 italic">Список авторов пуст</p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-2">
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
          {!showNewAuthor ? (
            <button
              type="button"
              onClick={() => setShowNewAuthor(true)}
              className="text-sm text-blue-400 hover:text-blue-300 transition"
            >
              + Новый автор (нет в списке)
            </button>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAuthorName}
                  onChange={(e) => setNewAuthorName(e.target.value)}
                  placeholder="например: А. А. Автаева"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={handleCreateAuthor}
                  disabled={creatingAuthor || !newAuthorName.trim()}
                  className="shrink-0 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 disabled:opacity-50 transition"
                >
                  {creatingAuthor ? "..." : "Создать"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setShowNewAuthor(false); setNewAuthorName(""); setAuthorError(null); }}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition"
              >
                − Отмена
              </button>
            </>
          )}
        </div>

        {/* Темы */}
        <div>
          <label className={labelClass}>Темы</label>
          {topicError && <p className="text-red-400 text-sm mb-1">{topicError}</p>}
          <div className="flex flex-wrap gap-2 mb-2">
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
          {!showNewTopic ? (
            <button
              type="button"
              onClick={() => setShowNewTopic(true)}
              className="text-sm text-blue-400 hover:text-blue-300 transition"
            >
              + Новая тема (нет в списке)
            </button>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="например: Оптика"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={handleCreateTopic}
                  disabled={creatingTopic || !newTopicName.trim()}
                  className="shrink-0 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 disabled:opacity-50 transition"
                >
                  {creatingTopic ? "..." : "Создать"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setShowNewTopic(false); setNewTopicName(""); setTopicError(null); }}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition"
              >
                − Отмена
              </button>
            </>
          )}
        </div>

        {/* Подтемы */}
        <div>
          <label className={labelClass}>Подтемы</label>
          {topicIds.length === 0 ? (
            <p className="text-sm text-white/50 italic">Выберите тему</p>
          ) : (
            <>
              {subtopicError && <p className="text-red-400 text-sm mb-1">{subtopicError}</p>}
              <div className="flex flex-wrap gap-2 mb-2">
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
              {!showNewSubtopic ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowNewSubtopic(true);
                    setNewSubtopicTopicId(topicIds[0]);
                  }}
                  className="text-sm text-blue-400 hover:text-blue-300 transition"
                >
                  + Новая подтема (нет в списке)
                </button>
              ) : (
                <>
                  <div className="flex gap-2">
                    {topicIds.length > 1 && (
                      <select
                        value={newSubtopicTopicId}
                        onChange={(e) => setNewSubtopicTopicId(e.target.value ? Number(e.target.value) : "")}
                        className={inputClass + " shrink-0 w-auto"}
                      >
                        {topics
                          .filter((t) => topicIds.includes(t.id))
                          .map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                      </select>
                    )}
                    <input
                      type="text"
                      value={newSubtopicName}
                      onChange={(e) => setNewSubtopicName(e.target.value)}
                      placeholder="например: Рефракция"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={handleCreateSubtopic}
                      disabled={creatingSubtopic || !newSubtopicName.trim()}
                      className="shrink-0 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 disabled:opacity-50 transition"
                    >
                      {creatingSubtopic ? "..." : "Создать"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowNewSubtopic(false); setNewSubtopicName(""); setSubtopicError(null); }}
                    className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition"
                  >
                    − Отмена
                  </button>
                </>
              )}
            </>
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
