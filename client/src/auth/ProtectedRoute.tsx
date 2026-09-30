import { Navigate, Outlet } from 'react-router-dom'
import type { UserRole } from '../api/client'
import { useAuth } from './AuthContext'

export const ProtectedRoute = ({ roles }: { roles?: UserRole[] }) => {
  const { user, loading } = useAuth()

  if (loading) return <div className="route-loading" role="status">Checking your account…</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return <Outlet />
}