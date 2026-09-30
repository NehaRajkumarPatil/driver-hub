import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { homeForRole, useAuth } from './auth/AuthContext'
import AdminWorkspace from './pages/AdminWorkspace'
import DriverWorkspace from './pages/DriverWorkspace'
import EmployerWorkspace from './pages/EmployerWorkspace'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import './App.css'

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="route-loading" role="status">Loading your account…</div>
  return <Navigate to={user ? homeForRole(user.role) : '/login'} replace />
}

function App() {
  return <Routes>
    <Route path="/" element={<RootRedirect />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route element={<ProtectedRoute roles={['DRIVER']} />}>
      <Route path="/driver" element={<DriverWorkspace />} />
    </Route>
    <Route element={<ProtectedRoute roles={['EMPLOYER']} />}>
      <Route path="/employer" element={<EmployerWorkspace />} />
    </Route>
    <Route element={<ProtectedRoute roles={['ADMIN']} />}>
      <Route path="/admin" element={<AdminWorkspace />} />
    </Route>
    <Route path="*" element={<RootRedirect />} />
  </Routes>
}

export default App
