import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { RealtimeProvider } from './realtime/RealtimeContext.jsx'
import { FavoritesProvider } from './context/FavoritesContext.jsx'
import { ChatProvider } from './context/ChatContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
// Single style entry point — all global styles live in src/styles/ (see index.css).
import './styles/index.css'
import './components/Modal.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ThemeProvider>
          <RealtimeProvider>
            <FavoritesProvider>
              <ChatProvider>
                <NotificationProvider>
                  <App />
                </NotificationProvider>
              </ChatProvider>
            </FavoritesProvider>
          </RealtimeProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
