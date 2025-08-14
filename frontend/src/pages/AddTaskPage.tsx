import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

type Source = { id: number; name: string; year?: number | null; grade?: number | null };
type Topic = { id: number; name: string };
type Subtopic = { id: number; name: string; topic_id: number };
type Author = { id: number; name: string };

export default function AddTaskPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // поля формы
  const [text, setText] = useState("");
  const [solution, setSolution] = useState("");
  const [answer, setAnswer] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [sourceId, setSourceId] = useState<number | "">("");
  const [authorId, setAuthorId] = useState<number | "">("");
  const [topicIds, setTopicIds] = useState<number[]>([]);
  const [subtopicIds, setSubtopicIds] = useState<number[]>([]);

  // справочники
  const [sources, setSources] = useState<Source[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // доступ только для админов/модераторов
  useEffect(() => {
    if (!user || !["admin", "moderator"].includes(user.role)) {
      navigate("/");
    }
  }, [user, navigate]);

  // подгрузка справочников — ВАЖНО: все урлы со слэшем
  useEffect(() => {
    Promise.all([
      fetch("/api/sources/").then(r => r.json()),
      fetch("/api/topics/").then(r => r.json()),
      fetch("/api/subtopics/").then(r => r.json()),
      fetch("/api/authors/").then(r => r.json()),
    ])
      .then(([srcs, tps, stps, auths]) => {
        setSources(srcs ?? []);
        setTopics(tps ?? []);
        setSubtopics(stps ?? []);
        setAuthors(auths ?? []);
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
      if (!token) throw new Error("Вы не авторизованы");
      if (!text.trim()) throw new Error("Введите условие задачи");
      if (sourceId === "") throw new Error("Выберите источник");

      const payload = {
        text,
        solution: solution || null,
        answer: answer || null,
        difficulty: Number(difficulty),
        source_id: Number(sourceId),
        author_id: authorId === "" ? null : Number(authorId), // ← отправляем автора, если выбран
        topic_ids: topicIds,
        subtopic_ids: subtopicIds,
      };

      const res = await fetch("/api/tasks/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "omit",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("POST /api/tasks/ →", res.status, text.slice(0, 300));
        throw new Error("Ошибка добавления задачи");
      }

      alert("Задача успешно добавлена!");
      navigate("/tasks");
    } catch (err: any) {
      setError(err.message || "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Добавить задачу</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Условие */}
        <div>
          <label className="block mb-1">Условие</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2"
            rows={4}
            required
          />
        </div>

        {/* Решение */}
        <div>
          <label className="block mb-1">Решение (необязательно)</label>
          <textarea
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            className="w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2"
            rows={3}
          />
        </div>

        {/* Ответ */}
        <div>
          <label className="block mb-1">Ответ (необязательно)</label>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2"
          />
        </div>

        {/* Сложность */}
        <div>
          <label className="block mb-1">Сложность</label>
          <input
            type="number"
            min={1}
            max={10}
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2"
          />
        </div>

        {/* Источник */}
        <div>
          <label className="block mb-1">Источник</label>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value ? Number(e.target.value) : "")}
            className="w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2"
            required
          >
            <option value="">Выберите источник</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.year ? `, ${s.year}` : ""}{s.grade ? `, ${s.grade} кл.` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Автор */}
        <div>
          <label className="block mb-1">Автор (необязательно)</label>
          <select
            value={authorId}
            onChange={(e) => setAuthorId(e.target.value ? Number(e.target.value) : "")}
            className="w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2"
          >
            <option value="">Не указывать автора</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        {/* Темы */}
        <div>
          <label className="block mb-1">Темы</label>
          {topics.map((t) => (
            <label key={t.id} className="block text-sm text-white/80">
              <input
                type="checkbox"
                className="mr-2"
                checked={topicIds.includes(t.id)}
                onChange={() => toggleArrayValue(t.id, topicIds, setTopicIds)}
              />
              {t.name}
            </label>
          ))}
        </div>

        {/* Подтемы */}
        <div>
          <label className="block mb-1">Подтемы</label>
          {subtopics
            .filter((st) => topicIds.includes(st.topic_id))
            .map((st) => (
              <label key={st.id} className="block text-sm text-white/80">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={subtopicIds.includes(st.id)}
                  onChange={() => toggleArrayValue(st.id, subtopicIds, setSubtopicIds)}
                />
                {st.name}
              </label>
            ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 disabled:opacity-60"
        >
          {loading ? "Добавляем..." : "Добавить задачу"}
        </button>
      </form>
    </div>
  );
}
