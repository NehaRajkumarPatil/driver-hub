import { useEffect, useState, type ComponentType } from 'react'
import { ArrowRight, BriefcaseBusiness, Check, FileText, LayoutDashboard, ShieldCheck, Users, X } from 'lucide-react'
import { api, getApiErrorMessage, type UserRole } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { WorkspaceShell, type WorkspacePage } from '../components/WorkspaceShell'

type AdminPage = 'Overview' | 'Users' | 'Jobs' | 'Applications'
type Stats = { users: { total: number; drivers: number; employers: number; admins: number }; jobs: { total: number; pending: number; approved: number; rejected: number; blocked: number; closed: number }; applications: number }
type AdminUser = { id: string; name: string; email: string; phone: string | null; role: UserRole; status: 'ACTIVE' | 'BLOCKED'; createdAt: string; driverProfile: { location: string | null; isProfilePublic: boolean } | null; employerProfile: { companyName: string; verified: boolean } | null }
type AdminJob = { id: string; title: string; driverCategory: string; location: string; salaryMin: number | string | null; salaryMax: number | string | null; status: string; createdAt: string; employer: { companyName: string; verified: boolean }; _count: { applications: number } }
type AdminApplication = { id: string; status: string; createdAt: string; job: { id: string; title: string; location: string; employer: { companyName: string } }; driver: { userId: string; user: { name: string; email: string } } }

const pages: WorkspacePage[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Users', icon: Users },
  { label: 'Jobs', icon: BriefcaseBusiness },
  { label: 'Applications', icon: FileText },
]

export default function AdminWorkspace() {
  const { user, logout } = useAuth()
  const [page, setPage] = useState<AdminPage>('Overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [jobs, setJobs] = useState<AdminJob[]>([])
  const [applications, setApplications] = useState<AdminApplication[]>([])
  const [userRole, setUserRole] = useState('')
  const [jobStatus, setJobStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadStats = async () => {
    const response = await api.get<{ data: { stats: Stats } }>('/admin/stats')
    setStats(response.data.data.stats)
  }

  const loadUsers = async () => {
    setListLoading(true)
    setError('')
    try {
      const response = await api.get<{ data: { users: AdminUser[] } }>('/admin/users', { params: { ...(userRole ? { role: userRole } : {}), page: 1, limit: 100 } })
      setUsers(response.data.data.users)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setListLoading(false)
    }
  }

  const loadJobs = async () => {
    setListLoading(true)
    setError('')
    try {
      const response = await api.get<{ data: { jobs: AdminJob[] } }>('/admin/jobs', { params: { ...(jobStatus ? { status: jobStatus } : {}), page: 1, limit: 100 } })
      setJobs(response.data.data.jobs)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setListLoading(false)
    }
  }

  const loadApplications = async () => {
    setListLoading(true)
    setError('')
    try {
      const response = await api.get<{ data: { applications: AdminApplication[] } }>('/admin/applications', { params: { page: 1, limit: 100 } })
      setApplications(response.data.data.applications)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    loadStats().catch((requestError: unknown) => setError(getApiErrorMessage(requestError))).finally(() => setLoading(false))
  }, [])
  useEffect(() => { if (page === 'Users') void loadUsers() }, [page, userRole])
  useEffect(() => { if (page === 'Jobs') void loadJobs() }, [page, jobStatus])
  useEffect(() => { if (page === 'Applications') void loadApplications() }, [page])

  const refreshStats = async () => {
    try {
      await loadStats()
      setError('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    }
  }

  const changeUserStatus = async (target: AdminUser) => {
    setBusy(target.id)
    setError('')
    const status = target.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'
    try {
      const response = await api.patch<{ data: { user: AdminUser } }>(`/admin/users/${target.id}/status`, { status })
      setUsers((current) => current.map((item) => item.id === target.id ? { ...item, ...response.data.data.user } : item))
      setNotice(status === 'BLOCKED' ? 'User blocked.' : 'User unblocked.')
      window.setTimeout(() => setNotice(''), 3000)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setBusy('')
    }
  }

  const changeJobStatus = async (target: AdminJob, status: 'APPROVED' | 'REJECTED' | 'BLOCKED') => {
    setBusy(target.id)
    setError('')
    try {
      const response = await api.patch<{ data: { job: AdminJob } }>(`/admin/jobs/${target.id}/status`, { status })
      setJobs((current) => current.map((item) => item.id === target.id ? { ...item, ...response.data.data.job } : item))
      await refreshStats()
      setNotice(status === 'APPROVED' ? 'Job approved. The employer and matching drivers were notified.' : `Job ${status.toLowerCase()}.`)
      window.setTimeout(() => setNotice(''), 3200)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setBusy('')
    }
  }

  const statsReady = !loading && stats
  const title = page === 'Overview' ? 'Good morning, Admin.' : page

  return <WorkspaceShell role="ADMIN" user={user} page={page} pages={pages} onNavigate={(label) => { setPage(label as AdminPage); setError('') }} onSignOut={logout}>
    <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" />PLATFORM OVERVIEW</div><h1>{title}</h1><p className="welcome-subtitle">Review activity and keep the Driver Hub network moving.</p></div></section>
    {error && <ErrorPanel message={error} onClose={() => setError('')} />}
    {notice && <div className="success-note" role="status"><Check size={15} />{notice}</div>}
    {loading ? <LoadingPanel label="Loading platform stats…" /> : statsReady ? <section className="stats-row admin-stats">
      <StatCard label="TOTAL USERS" value={stats.users.total} note={`${stats.users.drivers} drivers · ${stats.users.employers} employers`} icon={Users} tone="green" />
      <StatCard label="PENDING JOBS" value={stats.jobs.pending} note={`${stats.jobs.approved} approved · ${stats.jobs.rejected} rejected`} icon={ShieldCheck} tone="peach" />
      <StatCard label="APPLICATIONS" value={stats.applications} note={`${stats.jobs.total} job posts total`} icon={FileText} tone="blue" />
    </section> : <EmptyPanel title="Stats unavailable" message="The admin stats could not be loaded." />}
    <div className="content-grid admin-content-grid">
      <section className="jobs-panel">
        <div className="section-heading"><div><span className="section-kicker">{page === 'Users' ? 'ACCOUNT MODERATION' : page === 'Jobs' ? 'POST MODERATION' : page === 'Applications' ? 'PLATFORM ACTIVITY' : 'ADMINISTRATION'}</span><h2>{page === 'Users' ? 'Users' : page === 'Jobs' ? 'Job posts' : page === 'Applications' ? 'Applications' : 'Review queue'}</h2></div>{page === 'Overview' && <button className="text-button" onClick={() => setPage('Jobs')}>Review pending jobs <ArrowRight size={14} /></button>}</div>
        {page === 'Overview' && <OverviewQueue stats={stats} onJobs={() => { setJobStatus('PENDING'); setPage('Jobs') }} onUsers={() => setPage('Users')} />}
        {page === 'Users' && <><div className="filter-row"><label className="select-box"><Users size={15} /><select value={userRole} onChange={(event) => setUserRole(event.target.value)} aria-label="Filter users by role"><option value="">All roles</option><option value="DRIVER">Drivers</option><option value="EMPLOYER">Employers</option><option value="ADMIN">Admins</option></select></label></div>{listLoading ? <LoadingPanel label="Loading users…" /> : users.length === 0 ? <EmptyPanel title="No users found" message="No accounts match this role filter." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Role</th><th>Profile</th><th>Status</th><th>Action</th></tr></thead><tbody>{users.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.email}</small></td><td>{item.role}</td><td>{item.driverProfile?.location ?? item.employerProfile?.companyName ?? '—'}</td><td><span className={`status-tag status-${item.status.toLowerCase()}`}>{item.status}</span></td><td><button className={`quiet-button compact ${item.status === 'ACTIVE' ? 'danger-quiet' : ''}`} disabled={busy === item.id || item.role === 'ADMIN'} onClick={() => void changeUserStatus(item)}>{busy === item.id ? 'Saving…' : item.status === 'ACTIVE' ? 'Block' : 'Unblock'}</button></td></tr>)}</tbody></table></div>}</>}
        {page === 'Jobs' && <><div className="filter-row"><label className="select-box"><BriefcaseBusiness size={15} /><select value={jobStatus} onChange={(event) => setJobStatus(event.target.value)} aria-label="Filter jobs by status"><option value="">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="BLOCKED">Blocked</option><option value="CLOSED">Closed</option></select></label></div>{listLoading ? <LoadingPanel label="Loading job posts…" /> : jobs.length === 0 ? <EmptyPanel title="No job posts found" message="There are no job posts in this filter." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Job</th><th>Employer</th><th>Applicants</th><th>Status</th><th>Review</th></tr></thead><tbody>{jobs.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><small>{item.driverCategory} · {item.location}</small></td><td>{item.employer.companyName}</td><td>{item._count.applications}</td><td><span className={`status-tag status-${item.status.toLowerCase()}`}>{item.status}</span></td><td><div className="table-actions">{item.status !== 'APPROVED' && <button className="quiet-button compact" disabled={busy === item.id} onClick={() => void changeJobStatus(item, 'APPROVED')}><Check size={13} /> Approve</button>}{item.status !== 'REJECTED' && <button className="quiet-button compact danger-quiet" disabled={busy === item.id} onClick={() => void changeJobStatus(item, 'REJECTED')}>Reject</button>}{item.status !== 'BLOCKED' && <button className="quiet-button compact danger-quiet" disabled={busy === item.id} onClick={() => void changeJobStatus(item, 'BLOCKED')}>Block</button>}</div></td></tr>)}</tbody></table></div>}</>}
        {page === 'Applications' && (listLoading ? <LoadingPanel label="Loading applications…" /> : applications.length === 0 ? <EmptyPanel title="No applications found" message="Applications will appear here as drivers apply to approved jobs." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Driver</th><th>Job</th><th>Employer</th><th>Status</th><th>Applied</th></tr></thead><tbody>{applications.map((item) => <tr key={item.id}><td><strong>{item.driver.user.name}</strong><small>{item.driver.user.email}</small></td><td><strong>{item.job.title}</strong><small>{item.job.location}</small></td><td>{item.job.employer.companyName}</td><td><span className={`status-tag status-${item.status.toLowerCase()}`}>{item.status}</span></td><td>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td></tr>)}</tbody></table></div>)}
      </section>
      <aside className="right-rail"><section className="rail-section"><div className="rail-heading"><div><span className="section-kicker">NEEDS ATTENTION</span><h3>Moderation queue</h3></div><ShieldCheck size={18} /></div><div className="pipeline-item"><span className="pipeline-dot yellow-dot" /><span>Pending job posts</span><strong>{stats?.jobs.pending ?? 0}</strong></div><div className="pipeline-item"><span className="pipeline-dot green-dot" /><span>Active users</span><strong>{stats?.users.total ?? 0}</strong></div><button className="rail-link" onClick={() => { setJobStatus('PENDING'); setPage('Jobs') }}>Open review queue <ArrowRight size={14} /></button></section></aside>
    </div>
    <footer className="page-footer"><span>© 2026 Driver Hub</span><span>Admin workspace</span></footer>
  </WorkspaceShell>
}

const StatCard = ({ label, value, note, icon: Icon, tone }: { label: string; value: number; note: string; icon: ComponentType<{ size?: number }>; tone: string }) => <div className="stat-card"><span className={`stat-icon ${tone}`}><Icon size={18} /></span><div className="stat-body"><span className="stat-label">{label}</span><div className="stat-value">{String(value).padStart(2, '0')}</div><span className="stat-note">{note}</span></div></div>
const OverviewQueue = ({ stats, onJobs, onUsers }: { stats: Stats | null; onJobs: () => void; onUsers: () => void }) => <div className="admin-overview-links"><button className="admin-overview-link" onClick={onJobs}><span className="stat-icon peach"><ShieldCheck size={17} /></span><span><strong>{stats?.jobs.pending ?? 0} job posts pending review</strong><small>Approve, reject, or block employer listings</small></span><ArrowRight size={16} /></button><button className="admin-overview-link" onClick={onUsers}><span className="stat-icon blue"><Users size={17} /></span><span><strong>{stats?.users.total ?? 0} platform accounts</strong><small>Review and manage user access</small></span><ArrowRight size={16} /></button></div>
const LoadingPanel = ({ label }: { label: string }) => <div className="state-panel loading-state" role="status"><span className="loading-spinner" />{label}</div>
const EmptyPanel = ({ title, message }: { title: string; message: string }) => <div className="state-panel empty-state"><FileText size={23} /><strong>{title}</strong><span>{message}</span></div>
const ErrorPanel = ({ message, onClose }: { message: string; onClose: () => void }) => <div className="api-error" role="alert"><span>{message}</span><button className="icon-button" aria-label="Dismiss error" onClick={onClose}><X size={15} /></button></div>