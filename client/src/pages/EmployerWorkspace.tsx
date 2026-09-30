import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { api, getApiErrorMessage, type ApiJob, type EmployerProfile } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { NotificationsBell } from '../components/NotificationsBell'
import { WorkspaceShell, type WorkspacePage } from '../components/WorkspaceShell'

type EmployerJob = ApiJob & { _count: { applications: number } }
type Applicant = {
  id: string
  status: 'APPLIED' | 'VIEWED' | 'SHORTLISTED' | 'REJECTED' | 'HIRED'
  coverNote: string | null
  createdAt: string
  driver: {
    userId: string
    location: string | null
    bio: string | null
    licenseType: string | null
    totalExperienceYears: number
    skills: string[]
    availability: string | null
    experiences: { id: string; vehicleType: string; employerName: string; years: number }[]
    user: { name: string }
  }
}
type DriverResult = {
  userId: string
  location: string | null
  bio: string | null
  licenseType: string | null
  totalExperienceYears: number
  skills: string[]
  preferredCategories: string[]
  availability: string | null
  user: { name: string }
}
type DriverCategory = 'CAR' | 'TAXI' | 'TRUCK' | 'BUS' | 'DELIVERY' | 'PERSONAL' | 'HEAVY' | 'OTHER'
type EmployerPage = 'Overview' | 'My jobs' | 'Applicants' | 'Company profile' | 'Find drivers'
type DriverContact = { name: string; email: string; phone: string | null }

const navPages: WorkspacePage[] = [
  { label: 'Overview', icon: BriefcaseBusiness },
  { label: 'My jobs', icon: Truck },
  { label: 'Applicants', icon: Users },
  { label: 'Company profile', icon: Building2 },
  { label: 'Find drivers', icon: Search },
]
const categoryOptions: DriverCategory[] = ['CAR', 'TAXI', 'TRUCK', 'BUS', 'DELIVERY', 'PERSONAL', 'HEAVY', 'OTHER']

const useFeedback = () => {
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const fail = (requestError: unknown) => setError(getApiErrorMessage(requestError))
  const succeed = (message: string) => { setError(''); setNotice(message); window.setTimeout(() => setNotice(''), 3200) }
  return { error, setError, notice, setNotice, fail, succeed }
}

export default function EmployerWorkspace() {
  const { user, logout } = useAuth()
  const [page, setPage] = useState<EmployerPage>('Overview')
  const [profile, setProfile] = useState<EmployerProfile | null>(null)
  const [jobs, setJobs] = useState<EmployerJob[]>([])
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [selectedJob, setSelectedJob] = useState<EmployerJob | null>(null)
  const [drivers, setDrivers] = useState<DriverResult[]>([])
  const [driversSearched, setDriversSearched] = useState(false)
  const [contacts, setContacts] = useState<Record<string, DriverContact>>({})
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const [driverFilters, setDriverFilters] = useState({ q: '', location: '', category: '', minExperience: '' })
  const feedback = useFeedback()

  const loadWorkspace = async () => {
    setLoading(true)
    feedback.setError('')
    try {
      const [profileResponse, jobsResponse] = await Promise.all([
        api.get<{ data: { profile: EmployerProfile } }>('/employer/profile'),
        api.get<{ data: { jobs: EmployerJob[] } }>('/employer/jobs'),
      ])
      setProfile(profileResponse.data.data.profile)
      setJobs(jobsResponse.data.data.jobs)
    } catch (error) {
      feedback.fail(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadWorkspace() }, [])

  const openApplicants = async (job: EmployerJob) => {
    setSelectedJob(job)
    setPage('Applicants')
    setListLoading(true)
    feedback.setError('')
    try {
      const response = await api.get<{ data: { applications: Applicant[] } }>(`/employer/jobs/${job.id}/applications`)
      setApplicants(response.data.data.applications)
    } catch (error) {
      feedback.fail(error)
    } finally {
      setListLoading(false)
    }
  }

  const saveCompanyProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy('profile')
    feedback.setError('')
    try {
      const response = await api.put<{ data: { profile: EmployerProfile } }>('/employer/profile', {
        companyName: String(data.get('companyName')).trim(),
        industry: String(data.get('industry')).trim() || null,
        description: String(data.get('description')).trim() || null,
        location: String(data.get('location')).trim() || null,
        website: String(data.get('website')).trim() || null,
        logoUrl: String(data.get('logoUrl')).trim() || null,
      })
      setProfile(response.data.data.profile)
      feedback.succeed('Company profile saved.')
    } catch (error) {
      feedback.fail(error)
    } finally {
      setBusy('')
    }
  }

  const postJob = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const salaryValue = (name: string) => String(form.get(name) ?? '').trim()
    const requiredDocuments = String(form.get('requiredDocuments') ?? '').split(',').map((item) => item.trim()).filter(Boolean)
    const payload = {
      title: String(form.get('title')).trim(),
      driverCategory: String(form.get('driverCategory')) as DriverCategory,
      description: String(form.get('description')).trim(),
      location: String(form.get('location')).trim(),
      salaryMin: salaryValue('salaryMin') ? Number(salaryValue('salaryMin')) : null,
      salaryMax: salaryValue('salaryMax') ? Number(salaryValue('salaryMax')) : null,
      experienceRequired: Number(form.get('experienceRequired')),
      workingHours: String(form.get('workingHours')).trim() || null,
      requiredDocuments,
      vacancies: Number(form.get('vacancies')),
    }
    setBusy('post')
    feedback.setError('')
    try {
      await api.post('/employer/jobs', payload)
      setFormOpen(false)
      await loadWorkspace()
      feedback.succeed('Job submitted for admin approval.')
      setPage('My jobs')
    } catch (error) {
      feedback.fail(error)
    } finally {
      setBusy('')
    }
  }

  const changeApplicationStatus = async (application: Applicant, status: 'SHORTLISTED' | 'REJECTED' | 'HIRED') => {
    setBusy(application.id)
    feedback.setError('')
    try {
      const response = await api.patch<{ data: { application: { status: Applicant['status'] } } }>(`/applications/${application.id}/status`, { status })
      setApplicants((current) => current.map((item) => item.id === application.id ? { ...item, status: response.data.data.application.status } : item))
      if (status !== 'SHORTLISTED') {
        setContacts((current) => {
          const next = { ...current }
          delete next[application.id]
          return next
        })
      }
      feedback.succeed(`Candidate ${status.toLowerCase()}.`)
    } catch (error) {
      feedback.fail(error)
    } finally {
      setBusy('')
    }
  }

  const revealContact = async (application: Applicant) => {
    setBusy(`contact-${application.id}`)
    feedback.setError('')
    try {
      const response = await api.get<{ data: { contact: DriverContact } }>(`/employer/applications/${application.id}/contact`)
      setContacts((current) => ({ ...current, [application.id]: response.data.data.contact }))
    } catch (error) {
      feedback.fail(error)
    } finally {
      setBusy('')
    }
  }

  const searchDrivers = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setListLoading(true)
    setDriversSearched(true)
    feedback.setError('')
    const params = new URLSearchParams()
    if (driverFilters.q.trim()) params.set('q', driverFilters.q.trim())
    if (driverFilters.location.trim()) params.set('location', driverFilters.location.trim())
    if (driverFilters.category) params.set('category', driverFilters.category)
    if (driverFilters.minExperience) params.set('minExperience', driverFilters.minExperience)
    try {
      const response = await api.get<{ data: { drivers: DriverResult[] } }>(`/employer/drivers?${params.toString()}`)
      setDrivers(response.data.data.drivers)
    } catch (error) {
      feedback.fail(error)
    } finally {
      setListLoading(false)
    }
  }

  const pendingCount = jobs.filter((job) => job.status === 'PENDING').length
  const activeCount = jobs.filter((job) => job.status === 'APPROVED').length
  const pageHeading = page === 'Overview' ? 'Find your next great driver.' : page

  return <WorkspaceShell role="EMPLOYER" user={user} page={page} pages={navPages} onNavigate={(label) => { setPage(label as EmployerPage); feedback.setError('') }} onSignOut={logout} notifications={<NotificationsBell />}>
    <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" />EMPLOYER DASHBOARD</div><h1>{pageHeading}</h1><p className="welcome-subtitle">A better hire makes every mile count.</p></div>{page !== 'Applicants' && <button className="primary-button" onClick={() => setFormOpen(true)}><Plus size={17} /> Post a job</button>}</section>
    <section className="stats-row">
      <StatCard label="ACTIVE JOBS" value={activeCount} note="Approved and visible" icon={BriefcaseBusiness} tone="green" />
      <StatCard label="PENDING REVIEW" value={pendingCount} note="Awaiting admin approval" icon={ShieldCheck} tone="peach" />
      <StatCard label="APPLICANTS" value={jobs.reduce((sum, job) => sum + job._count.applications, 0)} note="Across your job posts" icon={Users} tone="blue" />
    </section>
    <div className="content-grid">
      <section className="jobs-panel">
        <div className="section-heading"><div><span className="section-kicker">{page === 'Company profile' ? 'COMPANY SETTINGS' : page === 'Find drivers' ? 'TALENT SEARCH' : page === 'Applicants' ? 'CANDIDATE PIPELINE' : 'TALENT BOARD'}</span><h2>{page === 'Company profile' ? 'Company details' : page === 'Applicants' ? `Applicants${selectedJob ? ` · ${selectedJob.title}` : ''}` : page === 'Find drivers' ? 'Search driver profiles' : 'Your job posts'}</h2></div>{page === 'Applicants' && <button className="text-button" onClick={() => setPage('My jobs')}>Back to jobs <ArrowRight size={14} /></button>}</div>
        {feedback.error && <ErrorPanel message={feedback.error} onClose={() => feedback.setError('')} />}
        {feedback.notice && <div className="success-note" role="status"><Check size={15} />{feedback.notice}</div>}
        {loading && page !== 'Find drivers' && <LoadingPanel label="Loading employer workspace…" />}
        {!loading && page === 'Company profile' && <CompanyProfileForm profile={profile} busy={busy === 'profile'} onSubmit={saveCompanyProfile} />}
        {!loading && (page === 'Overview' || page === 'My jobs') && <JobList jobs={jobs} onApplicants={openApplicants} onPost={() => setFormOpen(true)} />}
        {page === 'Applicants' && <ApplicantList applicants={applicants} selectedJob={selectedJob} loading={listLoading} busy={busy} contacts={contacts} onStatus={changeApplicationStatus} onContact={revealContact} />}
        {page === 'Find drivers' && <DriverSearch filters={driverFilters} setFilters={setDriverFilters} drivers={drivers} loading={listLoading} searched={driversSearched} onSubmit={searchDrivers} />}
      </section>
      <aside className="right-rail">
        <section className="rail-section"><div className="rail-heading"><div><span className="section-kicker">YOUR PIPELINE</span><h3>Hiring activity</h3></div><Users size={18} /></div><div className="pipeline-item"><span className="pipeline-dot green-dot" /><span>Active listings</span><strong>{activeCount}</strong></div><div className="pipeline-item"><span className="pipeline-dot yellow-dot" /><span>Awaiting review</span><strong>{pendingCount}</strong></div><button className="rail-link" onClick={() => setPage('My jobs')}>Open your job posts <ArrowRight size={14} /></button></section>
        <section className="tip-card employer-tip"><div className="tip-icon"><Users size={18} /></div><span className="section-kicker">HIRING NOTE</span><h3>Good details bring good drivers.</h3><p>Clear pay, schedule, and licence requirements help the right people find your post.</p><button onClick={() => setFormOpen(true)}>Post a vacancy <ArrowRight size={14} /></button><span className="tip-decoration"><Truck size={80} /></span></section>
        <div className="rail-footer"><span>DRIVER HUB · 2026</span><span>{profile?.verified ? 'VERIFIED COMPANY' : 'EMPLOYER'}</span></div>
      </aside>
    </div>
    <footer className="page-footer"><span>© 2026 Driver Hub</span><span>Built for the people who keep us moving.</span></footer>
    {formOpen && <PostJobModal busy={busy === 'post'} onClose={() => setFormOpen(false)} onSubmit={postJob} />}
  </WorkspaceShell>
}

const StatCard = ({ label, value, note, icon: Icon, tone }: { label: string; value: number; note: string; icon: typeof Users; tone: string }) => <div className="stat-card"><span className={`stat-icon ${tone}`}><Icon size={18} /></span><div className="stat-body"><span className="stat-label">{label}</span><div className="stat-value">{String(value).padStart(2, '0')}</div><span className="stat-note">{note}</span></div></div>

const CompanyProfileForm = ({ profile, busy, onSubmit }: { profile: EmployerProfile | null; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) => {
  if (!profile) return <EmptyPanel title="Company profile unavailable" message="The API did not return an employer profile." />
  return <div className="profile-panel"><form className="company-profile-form" onSubmit={onSubmit} key={`${profile.userId}-${profile.companyName}`}>
    <div className="company-form-row"><label>Company name<input name="companyName" required minLength={2} maxLength={160} defaultValue={profile.companyName} /></label><label>Industry<input name="industry" maxLength={120} defaultValue={profile.industry ?? ''} placeholder="e.g. Transportation" /></label></div>
    <div className="company-form-row"><label>Location<input name="location" maxLength={160} defaultValue={profile.location ?? ''} placeholder="City, Province" /></label><label>Website<input name="website" type="url" defaultValue={profile.website ?? ''} placeholder="https://example.com" /></label></div>
    <label>Logo URL<input name="logoUrl" type="url" defaultValue={profile.logoUrl ?? ''} placeholder="https://example.com/logo.png" /></label>
    <label>Company description<textarea name="description" rows={5} maxLength={4000} defaultValue={profile.description ?? ''} placeholder="Tell drivers about your company and routes" /></label>
    <div className="company-form-actions"><span>{profile.verified ? 'Verified employer profile' : 'Changes are saved to your employer profile.'}</span><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : <><Check size={15} /> Save profile</>}</button></div>
  </form></div>
}

const JobList = ({ jobs, onApplicants, onPost }: { jobs: EmployerJob[]; onApplicants: (job: EmployerJob) => void; onPost: () => void }) => {
  if (!jobs.length) return <EmptyPanel title="No job posts yet" message="Post your first driver vacancy to start receiving applications." action={<button className="primary-button" onClick={onPost}><Plus size={15} /> Post a job</button>} />
  return <div className="job-list">{jobs.map((job, index) => <article className="job-card employer-job-card" key={job.id}>
    <span className={`company-mark ${['mint', 'peach', 'blue', 'yellow', 'lavender'][index % 5]}`}><Building2 size={20} /></span>
    <div className="job-main"><div className="job-company-line"><span>{job.employer.companyName}</span><span className={`status-tag status-${job.status.toLowerCase()}`}>{job.status}</span></div><h3>{job.title}</h3><div className="job-meta"><span><MapPin size={14} />{job.location}</span><span><Truck size={14} />{job.driverCategory}</span><span><Wallet size={14} />{salaryText(job)}</span></div><div className="job-bottom"><span className="experience">{job.experienceRequired} years experience</span><span className="experience">{job._count.applications} applicants</span></div></div>
    <div className="job-actions"><button className="quiet-button compact" onClick={() => onApplicants(job)}><Users size={14} /> Applicants</button></div>
  </article>)}</div>
}

const ApplicantList = ({ applicants, selectedJob, loading, busy, contacts, onStatus, onContact }: {
  applicants: Applicant[]
  selectedJob: EmployerJob | null
  loading: boolean
  busy: string
  contacts: Record<string, DriverContact>
  onStatus: (application: Applicant, status: 'SHORTLISTED' | 'REJECTED' | 'HIRED') => void
  onContact: (application: Applicant) => void
}) => {
  if (loading) return <LoadingPanel label="Loading applicants…" />
  if (!selectedJob) return <EmptyPanel title="Choose a job post" message="Open My jobs and choose Applicants on a listing to review candidates." />
  if (!applicants.length) return <EmptyPanel title="No applicants yet" message="Applications for this job will appear here." />
  return <div className="applicant-list">{applicants.map((application) => {
    const driver = application.driver
    const contact = contacts[application.id]
    return <article className="applicant-entry" key={application.id}><div className="applicant-row"><span className="avatar avatar-large mint">{getInitials(driver.user.name)}</span><div className="applicant-info"><strong>{driver.user.name}</strong><span>{driver.licenseType ?? 'Licence not listed'} · {driver.totalExperienceYears} years experience</span></div><span className={`status-tag status-${application.status.toLowerCase()}`}>{application.status}</span></div>
      <div className="applicant-details"><div className="applicant-detail-line"><span><MapPin size={13} />{driver.location ?? 'Location not listed'}</span><span><Truck size={13} />{driver.availability ?? 'Availability not listed'}</span></div>{driver.skills.length > 0 && <p className="skill-line">{driver.skills.join(' · ')}</p>}{application.coverNote && <p className="cover-note">“{application.coverNote}”</p>}</div>
      {contact && <div className="contact-reveal"><strong>Shortlisted contact</strong><a href={`mailto:${contact.email}`}>{contact.email}</a>{contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}</div>}
      <div className="applicant-actions">{application.status === 'SHORTLISTED' && <button className="quiet-button compact" disabled={busy === `contact-${application.id}`} onClick={() => onContact(application)}>{busy === `contact-${application.id}` ? 'Loading…' : contact ? 'Refresh contact' : 'View contact'}</button>}{application.status !== 'SHORTLISTED' && application.status !== 'HIRED' && application.status !== 'REJECTED' && <button className="quiet-button compact" disabled={busy === application.id} onClick={() => onStatus(application, 'SHORTLISTED')}><Check size={14} /> Shortlist</button>}{application.status !== 'HIRED' && application.status !== 'REJECTED' && <><button className="quiet-button compact danger-quiet" disabled={busy === application.id} onClick={() => onStatus(application, 'REJECTED')}>Reject</button><button className="primary-button compact" disabled={busy === application.id} onClick={() => onStatus(application, 'HIRED')}>Hire</button></>}</div>
    </article>
  })}</div>
}

const DriverSearch = ({ filters, setFilters, drivers, loading, searched, onSubmit }: { filters: { q: string; location: string; category: string; minExperience: string }; setFilters: (filters: { q: string; location: string; category: string; minExperience: string }) => void; drivers: DriverResult[]; loading: boolean; searched: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) => <>
  <form className="driver-search-form filter-row" onSubmit={onSubmit}><label className="search-box"><Search size={16} /><input value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="Name, skill, licence" /></label><label className="location-filter"><MapPin size={14} /><input value={filters.location} onChange={(event) => setFilters({ ...filters, location: event.target.value })} placeholder="Location" /></label><label className="select-box"><Truck size={14} /><select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">All categories</option>{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label><label className="experience-filter"><input type="number" min="0" max="70" value={filters.minExperience} onChange={(event) => setFilters({ ...filters, minExperience: event.target.value })} placeholder="Min years" /></label><button className="primary-button search-submit"><Search size={15} /><span>Search</span></button></form>
  {loading ? <LoadingPanel label="Searching public driver profiles…" /> : drivers.length === 0 ? <EmptyPanel title={searched ? 'No drivers found' : 'Search public profiles'} message={searched ? 'Try adjusting your filters.' : 'Enter a skill, location, category, or experience range to find candidates.'} /> : <div className="candidate-list">{drivers.map((driver) => <article className="candidate-card" key={driver.userId}><span className="avatar avatar-large mint">{getInitials(driver.user.name)}</span><div className="candidate-main"><strong>{driver.user.name}</strong><span>{driver.licenseType ?? 'Licence not listed'} · {driver.totalExperienceYears} years</span><span>{driver.location ?? 'Location not listed'} · {driver.availability ?? 'Availability not listed'}</span>{driver.skills.length > 0 && <small>{driver.skills.join(' · ')}</small>}<p>{driver.bio}</p></div></article>)}</div>}
</>

const PostJobModal = ({ busy, onClose, onSubmit }: { busy: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) => <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="post-modal employer-post-modal" role="dialog" aria-modal="true" aria-labelledby="post-job-title"><div className="modal-heading"><div><span className="section-kicker">NEW OPPORTUNITY</span><h2 id="post-job-title">Post a driver job</h2></div><button className="icon-button" aria-label="Close" onClick={onClose}><X size={19} /></button></div><form onSubmit={onSubmit} className="employer-job-form">
  <label>Job title<input name="title" required minLength={3} maxLength={160} placeholder="e.g. Class 1 Long Haul Driver" /></label>
  <div className="form-row"><label>Driver category<select name="driverCategory" required>{categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label>Location<input name="location" required minLength={2} maxLength={160} placeholder="City, Province" /></label></div>
  <label>Job description<textarea name="description" required minLength={20} maxLength={10000} rows={4} placeholder="Responsibilities, route details, and requirements" /></label>
  <div className="form-row"><label>Minimum salary<input name="salaryMin" type="number" min="0" step="100" placeholder="Optional" /></label><label>Maximum salary<input name="salaryMax" type="number" min="0" step="100" placeholder="Optional" /></label></div>
  <div className="form-row"><label>Experience required (years)<input name="experienceRequired" type="number" min="0" max="70" step="0.5" defaultValue="0" required /></label><label>Vacancies<input name="vacancies" type="number" min="1" max="10000" defaultValue="1" required /></label></div>
  <label>Working hours<input name="workingHours" maxLength={160} placeholder="Full-time · Day shift" /></label>
  <label>Required documents <small>Comma-separated</small><input name="requiredDocuments" placeholder="Valid licence, driving abstract" /></label>
  <div className="modal-actions"><span className="pending-hint">New jobs require admin approval.</span><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Submitting…' : <><Plus size={15} /> Submit job</>}</button></div>
</form></section></div>

const LoadingPanel = ({ label }: { label: string }) => <div className="state-panel loading-state" role="status"><span className="loading-spinner" />{label}</div>
const EmptyPanel = ({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) => <div className="state-panel empty-state"><BriefcaseBusiness size={23} /><strong>{title}</strong><span>{message}</span>{action}</div>
const ErrorPanel = ({ message, onClose }: { message: string; onClose: () => void }) => <div className="api-error" role="alert"><span>{message}</span><button className="icon-button" aria-label="Dismiss error" onClick={onClose}><X size={15} /></button></div>
const getInitials = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
const salaryText = (job: EmployerJob) => job.salaryMin == null && job.salaryMax == null ? 'Salary not listed' : `$${job.salaryMin ?? 0}–$${job.salaryMax ?? '…'} / yr`