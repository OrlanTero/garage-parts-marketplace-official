import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthModal from '../components/AuthModal.jsx'
import { useAuth } from '../auth/AuthContext.jsx'

export default function Register() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/marketplace', { replace: true })
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="auth-shell">
      <AuthModal 
        isOpen={true} 
        initialView="register" 
        onClose={() => navigate('/', { replace: true })} 
        onSuccess={() => navigate('/marketplace', { replace: true })}
      />
    </div>
  )
}
