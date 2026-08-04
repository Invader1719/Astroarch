import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import TaskForm, { type TaskPayload } from "@/components/TaskForm";

export default function AddTaskPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  // доступ только для админов/модераторов
  useEffect(() => {
    if (!user || !["admin", "moderator", "founder"].includes(user.role)) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (payload: TaskPayload) => {
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
      if (res.status === 401) {
        logout();
        throw new Error("Сессия истекла — войдите заново и повторите сохранение");
      }
      const data = await res.json().catch(() => ({}));
      console.error("POST /api/tasks/ →", res.status, data);
      throw new Error(data.detail || "Ошибка добавления задачи");
    }

    alert("Задача успешно добавлена!");
    navigate("/tasks");
  };

  return <TaskForm heading="Добавить задачу" submitLabel="Добавить задачу" onSubmit={handleSubmit} />;
}
