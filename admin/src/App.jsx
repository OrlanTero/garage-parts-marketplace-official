import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.jsx'
import { ProtectedRoute } from './auth/ProtectedRoute.jsx'
import { GuestRoute } from './auth/GuestRoute.jsx'
import { AdminLayout } from './layouts/AdminLayout.jsx'

// Admin Views
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CarsManagement from './pages/CarsManagement.jsx'
import PartsManagement from './pages/PartsManagement.jsx'
import UsersManagement from './pages/UsersManagement.jsx'
import InspectionsManagement from './pages/InspectionsManagement.jsx'
import SystemHealth from './pages/SystemHealth.jsx'
import AdminSettings from './pages/AdminSettings.jsx'
import Unauthorized from './pages/Unauthorized.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* Guest Only Routes */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />

          {/* Protected Admin Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="cars" element={<CarsManagement />} />
            <Route path="parts" element={<PartsManagement />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="inspections" element={<InspectionsManagement />} />
            <Route path="system" element={<SystemHealth />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
