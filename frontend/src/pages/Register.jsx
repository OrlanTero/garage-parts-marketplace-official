import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthModal from '../components/AuthModal.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { authLanding } from './Login.jsx'

export default function Register() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      navigate(authLanding(user), { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  return (
    <div className="auth-shell">
      <AuthModal 
        isOpen={true} 
        initialView="register" 
        onClose={() => navigate('/', { replace: true })} 
        onSuccess={() => navigate(authLanding(user), { replace: true })}
      />
    </div>
  )
}
