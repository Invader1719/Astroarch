import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import 'katex/dist/katex.min.css'
// при выделении и копировании отрендеренной формулы в буфер попадёт её
// исходный LaTeX-код ($...$), а не визуальный текст из кучи <span>
import 'katex/contrib/copy-tex'
import { BrowserRouter } from 'react-router-dom'

// 👇 добавь этот импорт
import { AuthProvider } from './context/AuthContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider> {/* <-- вот это обёртка */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
