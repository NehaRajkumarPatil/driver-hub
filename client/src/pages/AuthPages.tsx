import { useState, type FormEvent } from 'react'
import { ArrowRight, Truck } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import { homeForRole, useAuth } from '../auth/AuthContext'

export const LoginPage = () => {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!loading && user) return <Navigate to={homeForRole(user.role)} replace />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const signedInUser = await login({ email: String(form.get('email')), password: String(form.get('password')) })
      navigate(homeForRole(signedInUser.role), { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return <AuthFrame eyebrow="WELCOME BACK" title="Good to have you here." subtitle="Sign in to pick up where your next opportunity begins.">
    <form className="auth-form" onSubmit={submit}>
      <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required placeholder="Your password" /></label>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="primary-button auth-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} {!busy && <ArrowRight size={16} />}</button>
    </form>
    <p className="auth-switch">New to Driver Hub? <Link to="/register">Create an account</Link></p>
  </AuthFrame>
}

export const RegisterPage = () => {
  const { user, loading, register } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<'DRIVER' | 'EMPLOYER'>('DRIVER')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!loading && user) return <Navigate to={homeForRole(user.role)} replace />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const details = {
      name: String(form.get('name')),
      email: String(form.get('email')),
      phone: String(form.get('phone')) || undefined,
      password: String(form.get('password')),
      role,
      ...(role === 'EMPLOYER' ? { companyName: String(form.get('companyName')) } : {}),
    }
    try {
      const createdUser = await register(details)
      navigate(homeForRole(createdUser.role), { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return <AuthFrame eyebrow="JOIN DRIVER HUB" title="Your next mile starts here." subtitle="Create an account to find work or meet your next great hire.">
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-role-label">I’m joining as</div>
      <div className="auth-role-switch" role="group" aria-label="Account type">
        <button type="button" className={role === 'DRIVER' ? 'selected' : ''} onClick={() => setRole('DRIVER')}>Driver</button>
        <button type="button" className={role === 'EMPLOYER' ? 'selected' : ''} onClick={() => setRole('EMPLOYER')}>Employer</button>
      </div>
      <label>Your name<input name="name" autoComplete="name" minLength={2} maxLength={100} required placeholder="Full name" /></label>
      {role === 'EMPLOYER' && <label>Company name<input name="companyName" minLength={2} maxLength={160} required placeholder="Company or organization" /></label>}
      <div className="auth-field-row">
        <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
        <label>Phone <span className="optional-label">OPTIONAL</span><input name="phone" type="tel" autoComplete="tel" placeholder="+1 416 555 0100" /></label>
      </div>
      <label>Password<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required placeholder="At least 8 characters" /></label>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="primary-button auth-submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'} {!busy && <ArrowRight size={16} />}</button>
    </form>
    <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
  </AuthFrame>
}

const AuthFrame = ({ eyebrow, title, subtitle, children }: {
  eyebrow: string
  title: string
  subtitle: string
  children: React.ReactNode
}) => <main className="auth-page">
  <header className="auth-brand-row"><Link className="brand" to="/"><span className="brand-mark"><Truck size={20} /></span><span>driver<span className="brand-dot">.</span>hub</span></Link><span>DRIVER JOBS, MADE STRAIGHTFORWARD</span></header>
  <div className="auth-layout">
    <section className="auth-intro"><div className="eyebrow"><span className="eyebrow-line" />{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p><div className="auth-road-mark"><Truck size={96} strokeWidth={1.1} /></div></section>
    <section className="auth-panel">{children}</section>
  </div>
  <footer className="auth-footer"><span>© 2026 Driver Hub</span><span>Built for the people who keep us moving.</span></footer>
</main>

export const RoleLandingPage = ({ role }: { role: 'EMPLOYER' | 'ADMIN' }) => {
  const { user, logout } = useAuth()
  const title = role === 'EMPLOYER' ? 'Employer workspace' : 'Admin workspace'
  const subtitle = role === 'EMPLOYER'
    ? 'Your employer account is signed in. The connected hiring workspace arrives in the next phase.'
    : 'Your admin account is signed in. The connected moderation workspace arrives in the next phase.'

  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" to="/"><span className="brand-mark"><Truck size={20} /></span><span>driver<span className="brand-dot">.</span>hub</span></Link>
      <div className="workspace-label">WORKSPACE</div>
      <div className="side-caption">ACCOUNT</div>
      <div className="role-account"><span className="avatar avatar-dark">{role === 'EMPLOYER' ? 'EM' : 'AD'}</span><span><strong>{user?.name}</strong><small>{role === 'EMPLOYER' ? 'Employer' : 'Administrator'}</small></span></div>
      <div className="side-bottom"><button className="nav-item" onClick={logout}>Sign out</button></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{title}</strong></div><span className="demo-pill"><span /> CONNECTED ACCOUNT</span></header>
      <div className="page-content"><section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" />{role === 'EMPLOYER' ? 'EMPLOYER DASHBOARD' : 'PLATFORM OVERVIEW'}</div><h1>{title}</h1><p className="welcome-subtitle">{subtitle}</p></div></section>
        <section className="role-phase-panel"><span className="stat-icon green"><Truck size={18} /></span><div><strong>{role === 'EMPLOYER' ? 'Hiring tools are next.' : 'Moderation tools are next.'}</strong><p>Your role is protected and verified by the API. This workspace will be connected to live data in Phase 5.</p></div></section>
      </div>
    </main>
  </div>
}