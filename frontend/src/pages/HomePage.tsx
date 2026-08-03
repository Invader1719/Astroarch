import { Link } from "react-router-dom"

export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto mt-10 mb-10 p-6 bg-white/10 border border-white/20 rounded-lg backdrop-blur-md text-white text-center space-y-3">
      <h1 className="text-4xl font-bold tracking-wider">Astroarch</h1>
      <p className="text-white/60 italic">astro + archive — архив задач по олимпиадной астрономии</p>
      <p className="text-white/80 leading-relaxed">
        Здесь собраны задачи прошлых лет Всероссийской и других олимпиад по астрономии —
        с условиями, решениями и ответами. Можно фильтровать по теме, классу, году и
        сложности, а выбранные задачи — скачать в PDF или LaTeX.
      </p>
      <Link
        to="/tasks"
        className="inline-block mt-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-5 py-2 rounded-full transition"
      >
        Перейти к задачам →
      </Link>
    </div>
  )
}
