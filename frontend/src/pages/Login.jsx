import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthModal from '../components/AuthModal.jsx'
import { useAuth } from '../auth/AuthContext.jsx'

/** Post-auth landing: fresh accounts finish the /welcome setup wizard. */
export function authLanding(user) {
  return user?.needs_onboarding ? '/welcome' : '/marketplace'
}

export default function Login() {
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
        initialView="login" 
        onClose={() => navigate('/', { replace: true })} 
        onSuccess={() => navigate(authLanding(user), { replace: true })}
      />
    </div>
  )
}
