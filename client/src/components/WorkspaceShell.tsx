import type { ComponentType } from 'react'
import { ChevronDown, Menu, Truck, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { AuthUser, UserRole } from '../api/client'
import { useState } from 'react'

export type WorkspacePage = { label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> }

export const WorkspaceShell = ({
  role,
  user,
  page,
  pages,
  onNavigate,
  onSignOut,
  children,
  notifications,
}: {
  role: UserRole
  user: AuthUser | null
  page: string
  pages: WorkspacePage[]
  onNavigate: (label: string) => void
  onSignOut: () => void
  notifications?: React.ReactNode
  children: React.ReactNode
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const roleLabel = role === 'EMPLOYER' ? 'EMPLOYER ACCOUNT' : 'ADMIN ACCOUNT'
  const initials = user?.name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') ?? 'DH'

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
      <Link className="brand" to="/"><span className="brand-mark"><Truck size={20} strokeWidth={2.2} /></span><span>driver<span className="brand-dot">.</span>hub</span></Link>
      <div className="workspace-label">WORKSPACE</div>
      <div className="role-caption">{roleLabel}</div>
      <div className="side-caption">MENU</div>
      <nav className="side-nav" aria-label={`${role.toLowerCase()} navigation`}>
        {pages.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${page === label ? 'nav-active' : ''}`} onClick={() => { onNavigate(label); setMobileNavOpen(false) }}><Icon size={18} strokeWidth={1.8} /><span>{label}</span></button>)}
      </nav>
      <div className="side-bottom">
        <div className="side-divider" />
        <div className="account-chip account-static"><span className="avatar avatar-dark">{initials}</span><span className="account-copy"><strong>{user?.name ?? 'Driver Hub user'}</strong><small>{role === 'EMPLOYER' ? user?.employerProfile?.companyName ?? 'Employer' : 'Administrator'}</small></span><ChevronDown size={15} /></div>
        <button className="nav-item signout-link" onClick={onSignOut}><X size={17} /><span>Sign out</span></button>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(!mobileNavOpen)}><Menu size={20} /></button>
        <div className="breadcrumb">Workspace <span>/</span> <strong>{page}</strong></div>
        <div className="top-actions"><span className="demo-pill"><span /> CONNECTED ACCOUNT</span>{notifications}<span className="avatar avatar-user">{initials}</span></div>
      </header>
      <div className="page-content">{children}</div>
    </main>
    {mobileNavOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
  </div>
}