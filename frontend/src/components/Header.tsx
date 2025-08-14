import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { user } = useAuth();

  const baseLink =
    "text-blue-400 hover:text-blue-200 font-semibold transition";
  const active =
    "underline underline-offset-4 decoration-2 decoration-blue-400";

  return (
    <nav className="flex flex-wrap gap-4 mb-6 items-center border-b border-white/20 pb-4">
      <NavLink to="/" className={({ isActive }) => `${baseLink} ${isActive ? active : ""}`}>
        Главная
      </NavLink>

      <NavLink to="/tasks" className={({ isActive }) => `${baseLink} ${isActive ? active : ""}`}>
        Задачи
      </NavLink>

      {/* Кнопка "Добавить задачу" видна админу и модератору */}
      {user && ["admin", "moderator"].includes(user.role) && (
        <NavLink
          to="/add-task"
          className={({ isActive }) => `${baseLink} ${isActive ? active : ""}`}
        >
          Добавить задачу
        </NavLink>
      )}

      {/* Кнопка "Админ‑панель" только для admin */}
      {user?.role === "admin" && (
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `${baseLink} ${isActive ? active : ""} text-yellow-300`
          }
        >
          Админ‑панель
        </NavLink>
      )}

      <div className="ml-auto flex gap-4 items-center">
        {user ? (
          <>
            <span className="font-semibold">
              {user.first_name} {user.last_name}
            </span>
            <Link
              to="/profile"
              className="text-green-400 hover:text-green-200 font-semibold transition"
            >
              Личный кабинет
            </Link>
          </>
        ) : (
          <>
            <NavLink
              to="/login"
              className={({ isActive }) => `${baseLink} ${isActive ? active : ""}`}
            >
              Войти
            </NavLink>
            <NavLink
              to="/register"
              className={({ isActive }) => `${baseLink} ${isActive ? active : ""}`}
            >
              Регистрация
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
