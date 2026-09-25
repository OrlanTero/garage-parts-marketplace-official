import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { RealtimeProvider } from './realtime/RealtimeContext.jsx'
import { FavoritesProvider } from './context/FavoritesContext.jsx'
import { ChatProvider } from './context/ChatContext.jsx'
import './styles.css'
import './theme/theme.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <RealtimeProvider>
          <FavoritesProvider>
            <ChatProvider>
              <App />
            </ChatProvider>
          </FavoritesProvider>
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
