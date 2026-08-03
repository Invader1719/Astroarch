import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import TaskForm, { type TaskPayload } from "@/components/TaskForm";

type ApiTask = {
  id: number;
  title?: string | null;
  text: string;
  solution?: string | null;
  answer?: string | null;
  difficulty: number;
  grades: number[];
  year: number;
  source?: { id: number; name: string } | null;
  authors?: { id: number; name: string }[];
  topics: { id: number; name: string }[];
  subtopics: { id: number; name: string; topic_id: number }[];
};

export default function EditTaskPage() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [task, setTask] = useState<ApiTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // доступ только для админов/модераторов
  useEffect(() => {
    if (!user || !["admin", "moderator", "founder"].includes(user.role)) {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    fetch(`/api/tasks/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Задача не найдена");
        return res.json();
      })
      .then(setTask)
      .catch((e) => setLoadError(e.message || "Не удалось загрузить задачу"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (payload: TaskPayload) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "omit",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error(`PATCH /api/tasks/${id} →`, res.status, data);
      throw new Error(data.detail || "Ошибка сохранения задачи");
    }

    navigate(`/task/${id}`);
  };

  if (loading) return <div className="text-center text-white mt-10">Загрузка...</div>;
  if (loadError || !task) {
    return <div className="text-center text-red-400 mt-10">{loadError || "Задача не найдена"}</div>;
  }

  return (
    <TaskForm
      heading="Редактировать задачу"
      submitLabel="Сохранить изменения"
      initial={{
        title: task.title ?? "",
        text: task.text,
        solution: task.solution ?? "",
        answer: task.answer ?? "",
        difficulty: task.difficulty,
        grades: task.grades,
        year: task.year,
        sourceId: task.source?.id ?? "",
        authorIds: task.authors?.map((a) => a.id) ?? [],
        topicIds: task.topics?.map((t) => t.id) ?? [],
        subtopicIds: task.subtopics?.map((s) => s.id) ?? [],
      }}
      onSubmit={handleSubmit}
    />
  );
}
