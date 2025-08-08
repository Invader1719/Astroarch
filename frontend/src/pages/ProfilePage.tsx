import { useAuth } from "@/context/AuthContext"
import { useNavigate } from "react-router-dom"
import { useEffect } from "react"

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate("/login")
    }
  }, [user, navigate])

  if (!user) return null

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Личный кабинет</h1>
      <p><strong>ФИО:</strong> {user.last_name} {user.first_name} {user.middle_name ?? ""}</p>
      <p><strong>Никнейм:</strong> {user.nickname}</p>
      <p><strong>Роль:</strong> {user.role}</p>
      <p><strong>Люмины:</strong> {user.lumina}</p>

      <button
        onClick={() => {
          logout()
          navigate("/")
        }}
        className="mt-6 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Выйти из аккаунта
      </button>
    </div>
  )
}
