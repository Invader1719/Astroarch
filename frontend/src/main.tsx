import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
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
