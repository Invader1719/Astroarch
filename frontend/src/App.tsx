import { Routes, Route, Link } from 'react-router-dom'
import TasksPage from './pages/TasksPage'
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import { useAuth } from "./context/AuthContext"
import AddTaskPage from "./pages/AddTaskPage"
import ProfilePage from "./pages/ProfilePage"
import TaskDetailPage from "./pages/TaskDetailPage"

export default function App() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-black bg-opacity-70 text-white backdrop-blur-md px-4 py-6">
      <nav className="flex flex-wrap gap-4 mb-6 items-center border-b border-white/20 pb-4">
        <Link to="/" className="text-blue-400 hover:text-blue-200 font-semibold transition">Главная</Link>
        <Link to="/tasks" className="text-blue-400 hover:text-blue-200 font-semibold transition">Задачи</Link>

        {user && ["admin", "moderator"].includes(user.role) && (
          <Link to="/add-task" className="text-blue-400 hover:text-blue-200 font-semibold transition">
            Добавить задачу
          </Link>
        )}

        <div className="ml-auto flex gap-4 items-center">
          {user ? (
            <>
              <span className="font-semibold">{user.first_name} {user.last_name}</span>
              <Link to="/profile" className="text-green-400 hover:text-green-200 font-semibold transition">
                Личный кабинет
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="text-blue-400 hover:text-blue-200 font-semibold transition">Войти</Link>
              <Link to="/register" className="text-blue-400 hover:text-blue-200 font-semibold transition">Регистрация</Link>
            </>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<div className="text-xl">Привет! Это главная страница</div>} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/add-task" element={<AddTaskPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/task/:id" element={<TaskDetailPage />} />
      </Routes>
    </div>
  )
}
