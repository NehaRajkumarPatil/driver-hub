import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, AUTH_TOKEN_KEY, authExpiredEventName, type AuthUser, type UserRole } from '../api/client'

type Credentials = { email: string; password: string }
type Registration = Credentials & {
  name: string
  phone?: string
  role: 'DRIVER' | 'EMPLOYER'
  companyName?: string
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (credentials: Credentials) => Promise<AuthUser>
  register: (details: Registration) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const legacyDemoKeys = [
  'driver-hub-jobs',
  'driver-hub-applications',
  'driver-hub-saved-jobs',
  'driver-hub-company-profile',
]

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    legacyDemoKeys.forEach((key) => localStorage.removeItem(key))
    const expireSession = () => {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      setUser(null)
    }
    window.addEventListener(authExpiredEventName, expireSession)

    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return () => window.removeEventListener(authExpiredEventName, expireSession)
    }

    api.get<{ data: { user: AuthUser } }>('/auth/me')
      .then(({ data }) => setUser(data.data.user))
      .catch(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY)
        setUser(null)
      })
      .finally(() => setLoading(false))

    return () => window.removeEventListener(authExpiredEventName, expireSession)
  }, [])

  const acceptAuthResponse = (response: { data: { data: { user: AuthUser; accessToken: string } } }) => {
    localStorage.setItem(AUTH_TOKEN_KEY, response.data.data.accessToken)
    setUser(response.data.data.user)
    return response.data.data.user
  }

  const login = async (credentials: Credentials) =>
    acceptAuthResponse(await api.post('/auth/login', credentials))

  const register = async (details: Registration) =>
    acceptAuthResponse(await api.post('/auth/register', details))

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export const homeForRole = (role: UserRole) => {
  if (role === 'DRIVER') return '/driver'
  if (role === 'EMPLOYER') return '/employer'
  return '/admin'
}