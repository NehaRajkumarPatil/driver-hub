import { useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from 'react'
import {
  ArrowRight,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  LayoutDashboard,
  MapPin,
  Menu,
  Search,
  SlidersHorizontal,
  Truck,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  api,
  getApiErrorMessage,
  type ApiApplication,
  type ApiDocument,
  type ApiJob,
  type ApiNotification,
  type ApiSavedJob,
  type DriverExperience,
  type DriverProfile,
} from '../api/client'
import { useAuth } from '../auth/AuthContext'

type DriverPage = 'Overview' | 'Find jobs' | 'My applications' | 'Saved jobs' | 'My profile'
type Category = '' | 'CAR' | 'TAXI' | 'TRUCK' | 'BUS' | 'DELIVERY' | 'PERSONAL' | 'HEAVY' | 'OTHER'

const categories: { value: Category; label: string }[] = [
  { value: '', label: 'All categories' },
  { value: 'CAR', label: 'Car' },
  { value: 'TAXI', label: 'Taxi' },
  { value: 'TRUCK', label: 'Truck' },
  { value: 'BUS', label: 'Bus' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'HEAVY', label: 'Heavy vehicle' },
  { value: 'OTHER', label: 'Other' },
]

const jobColors = ['mint', 'peach', 'blue', 'yellow', 'lavender']

const formatSalary = (job: ApiJob) => {
  const minimum = job.salaryMin == null ? null : Number(job.salaryMin)
  const maximum = job.salaryMax == null ? null : Number(job.salaryMax)
  if (minimum !== null && maximum !== null) return `$${minimum.toLocaleString()}–$${maximum.toLocaleString()} / hr`
  if (minimum !== null) return `From $${minimum.toLocaleString()} / hr`
  if (maximum !== null) return `Up to $${maximum.toLocaleString()} / hr`
  return 'Salary not specified'
}

const categoryLabel = (category: string) => category.charAt(0) + category.slice(1).toLowerCase()
const dateLabel = (date: string) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')

export default function DriverWorkspace() {
  const { user, logout } = useAuth()
  const [page, setPage] = useState<DriverPage>('Overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [search, setSearch] = useState('')
  const [jobsRetry, setJobsRetry] = useState(0)
  const [category, setCategory] = useState<Category>('')
  const [location, setLocation] = useState('')
  const [jobs, setJobs] = useState<ApiJob[]>([])
  const [applications, setApplications] = useState<ApiApplication[]>([])
  const [savedJobs, setSavedJobs] = useState<ApiSavedJob[]>([])
  const [profile, setProfile] = useState<DriverProfile | null>(null)
  const [documents, setDocuments] = useState<ApiDocument[]>([])
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [accountLoading, setAccountLoading] = useState(true)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [jobsError, setJobsError] = useState('')
  const [accountError, setAccountError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionBusy, setActionBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedJob, setSelectedJob] = useState<ApiJob | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  const loadAccountData = async () => {
    setAccountLoading(true)
    setAccountError('')
    try {
      const [profileResponse, applicationsResponse, savedResponse, documentsResponse] = await Promise.all([
        api.get<{ data: { profile: DriverProfile } }>('/driver/profile'),
        api.get<{ data: { applications: ApiApplication[] } }>('/applications/me'),
        api.get<{ data: { savedJobs: ApiSavedJob[] } }>('/saved-jobs'),
        api.get<{ data: { documents: ApiDocument[] } }>('/documents'),
      ])
      setProfile(profileResponse.data.data.profile)
      setApplications(applicationsResponse.data.data.applications)
      setSavedJobs(savedResponse.data.data.savedJobs)
      setDocuments(documentsResponse.data.data.documents)
    } catch (error) {
      setAccountError(getApiErrorMessage(error))
    } finally {
      setAccountLoading(false)
    }
  }

  const loadNotifications = async () => {
    setNotificationsLoading(true)
    try {
      const response = await api.get<{ data: { notifications: ApiNotification[] } }>('/notifications')
      setNotifications(response.data.data.notifications)
    } catch (error) {
      setActionError(getApiErrorMessage(error))
    } finally {
      setNotificationsLoading(false)
    }
  }

  useEffect(() => {
    void loadAccountData()
    void loadNotifications()
  }, [])

  useEffect(() => {
    if (page !== 'Overview' && page !== 'Find jobs') return
    setJobsLoading(true)
    setJobsError('')
    const timer = window.setTimeout(() => {
      api.get<{ data: { jobs: ApiJob[] } }>('/jobs', {
        params: {
          ...(search ? { q: search } : {}),
          ...(category ? { category } : {}),
          ...(location.trim() ? { location: location.trim() } : {}),
          page: 1,
          limit: 20,
        },
      })
        .then((response) => setJobs(response.data.data.jobs))
        .catch((error: unknown) => setJobsError(getApiErrorMessage(error)))
        .finally(() => setJobsLoading(false))
    }, 180)
    return () => window.clearTimeout(timer)
  }, [page, search, category, location, jobsRetry])

  const appliedJobIds = useMemo(() => new Set(applications.map((application) => application.jobId)), [applications])
  const savedJobIds = useMemo(() => new Set(savedJobs.map((saved) => saved.jobId)), [savedJobs])
  const jobsToShow = page === 'My applications'
    ? applications.map((application) => ({ job: application.job, status: application.status }))
    : page === 'Saved jobs'
      ? savedJobs.map((saved) => ({ job: saved.job, status: undefined }))
      : jobs.map((job) => ({ job, status: undefined }))
  const unreadCount = notifications.filter((item) => !item.isRead).length
  const profileCompletion = profile
    ? Math.round(([profile.location, profile.licenseType, profile.licenseNumber, profile.bio, profile.totalExperienceYears > 0 ? 'experience' : ''].filter(Boolean).length / 5) * 100)
    : 0

  const refreshApplicationsAndSaved = async () => {
    const [applicationsResponse, savedResponse] = await Promise.all([
      api.get<{ data: { applications: ApiApplication[] } }>('/applications/me'),
      api.get<{ data: { savedJobs: ApiSavedJob[] } }>('/saved-jobs'),
    ])
    setApplications(applicationsResponse.data.data.applications)
    setSavedJobs(savedResponse.data.data.savedJobs)
  }

  const flashNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3200)
  }

  const applyToJob = async (jobId: string) => {
    setActionBusy(`apply-${jobId}`)
    setActionError('')
    try {
      await api.post(`/jobs/${jobId}/apply`, {})
      await refreshApplicationsAndSaved()
      flashNotice('Application sent. Track it in My applications.')
    } catch (error) {
      setActionError(getApiErrorMessage(error))
    } finally {
      setActionBusy('')
    }
  }

  const toggleSavedJob = async (jobId: string) => {
    setActionBusy(`save-${jobId}`)
    setActionError('')
    try {
      if (savedJobIds.has(jobId)) await api.delete(`/jobs/${jobId}/save`)
      else await api.post(`/jobs/${jobId}/save`, {})
      await refreshApplicationsAndSaved()
      flashNotice(savedJobIds.has(jobId) ? 'Job removed from your saved list.' : 'Job added to your saved list.')
    } catch (error) {
      setActionError(getApiErrorMessage(error))
    } finally {
      setActionBusy('')
    }
  }

  const openJobDetails = async (jobId: string) => {
    setSelectedJob(null)
    setDetailError('')
    setDetailLoading(true)
    try {
      const response = await api.get<{ data: { job: ApiJob } }>(`/jobs/${jobId}`)
      setSelectedJob(response.data.data.job)
    } catch (error) {
      setDetailError(getApiErrorMessage(error))
    } finally {
      setDetailLoading(false)
    }
  }

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSearch(searchText.trim())
    if (page === 'Overview') setPage('Find jobs')
  }

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const csv = (value: FormDataEntryValue | null) => String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean)
    const salary = String(form.get('expectedSalary') ?? '').trim()
    setActionBusy('profile')
    setActionError('')
    try {
      const response = await api.put<{ data: { profile: DriverProfile } }>('/driver/profile', {
        location: String(form.get('location') ?? '').trim() || null,
        dob: String(form.get('dob') ?? '') || null,
        bio: String(form.get('bio') ?? '').trim() || null,
        licenseType: String(form.get('licenseType') ?? '').trim() || null,
        licenseNumber: String(form.get('licenseNumber') ?? '').trim() || null,
        licenseExpiry: String(form.get('licenseExpiry') ?? '') || null,
        totalExperienceYears: Number(form.get('totalExperienceYears') ?? 0),
        skills: csv(form.get('skills')),
        preferredCategories: csv(form.get('preferredCategories')).map((item) => item.toUpperCase()),
        expectedSalary: salary ? Number(salary) : null,
        availability: String(form.get('availability') ?? '').trim() || null,
        isProfilePublic: form.get('isProfilePublic') === 'on',
      })
      setProfile((current) => ({ ...current!, ...response.data.data.profile }))
      flashNotice('Your driver profile was updated.')
    } catch (error) {
      setActionError(getApiErrorMessage(error))
    } finally {
      setActionBusy('')
    }
  }

  const addExperience = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setActionBusy('experience')
    setActionError('')
    try {
      await api.post('/driver/experience', {
        vehicleType: String(form.get('vehicleType')),
        employerName: String(form.get('employerName')),
        years: Number(form.get('years')),
        notes: String(form.get('notes') ?? '').trim() || undefined,
      })
      await loadAccountData()
      formElement.reset()
      flashNotice('Driving experience added.')
    } catch (error) {
      setActionError(getApiErrorMessage(error))
    } finally {
      setActionBusy('')
    }
  }

  const removeExperience = async (experienceId: string) => {
    setActionBusy(`experience-${experienceId}`)
    setActionError('')
    try {
      await api.delete(`/driver/experience/${experienceId}`)
      setProfile((current) => current ? {
        ...current,
        experiences: current.experiences?.filter((item) => item.id !== experienceId),
      } : current)
      flashNotice('Driving experience removed.')
    } catch (error) {
      setActionError(getApiErrorMessage(error))
    } finally {
      setActionBusy('')
    }
  }

  const uploadDocument = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('type', file.type.startsWith('image/') ? 'ID_PROOF' : 'RESUME')
    form.append('file', file)
    setActionBusy('document')
    setActionError('')
    try {
      const response = await api.post<{ data: { document: ApiDocument } }>('/documents', form)
      setDocuments((current) => [response.data.data.document, ...current])
      flashNotice('Document uploaded to your profile.')
    } catch (error) {
      setActionError(getApiErrorMessage(error))
    } finally {
      setActionBusy('')
      event.target.value = ''
    }
  }

  const deleteDocument = async (documentId: string) => {
    setActionBusy(`document-${documentId}`)
    setActionError('')
    try {
      await api.delete(`/documents/${documentId}`)
      setDocuments((current) => current.filter((document) => document.id !== documentId))
      flashNotice('Document removed.')
    } catch (error) {
      setActionError(getApiErrorMessage(error))
    } finally {
      setActionBusy('')
    }
  }

  const markNotificationRead = async (notification: ApiNotification) => {
    if (notification.isRead) return
    try {
      const response = await api.patch<{ data: { notification: ApiNotification } }>(`/notifications/${notification.id}/read`)
      setNotifications((current) => current.map((item) => item.id === notification.id ? response.data.data.notification : item))
    } catch (error) {
      setActionError(getApiErrorMessage(error))
    }
  }

  const markAllNotificationsRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })))
    } catch (error) {
      setActionError(getApiErrorMessage(error))
    }
  }

  const navItems = [
    { label: 'Overview' as const, icon: LayoutDashboard },
    { label: 'Find jobs' as const, icon: Search },
    { label: 'My applications' as const, icon: FileText },
    { label: 'Saved jobs' as const, icon: Bookmark },
    { label: 'My profile' as const, icon: Users },
  ]
  const heading = page === 'Overview' ? 'Your next drive starts here.' : page
  const showJobSearch = page === 'Overview' || page === 'Find jobs'

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
      <Link className="brand" to="/"><span className="brand-mark"><Truck size={20} strokeWidth={2.2} /></span><span>driver<span className="brand-dot">.</span>hub</span></Link>
      <div className="workspace-label">WORKSPACE</div>
      <div className="role-caption">DRIVER ACCOUNT</div>
      <div className="side-caption">MENU</div>
      <nav className="side-nav" aria-label="Driver navigation">
        {navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${page === label ? 'nav-active' : ''}`} onClick={() => { setPage(label); setMobileNavOpen(false); setActionError('') }}>
          <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
          {label === 'My applications' && applications.length > 0 && <span className="nav-count">{applications.length}</span>}
        </button>)}
      </nav>
      <div className="side-bottom">
        <button className="nav-item" onClick={() => { setNotificationsOpen(true); void loadNotifications() }}><CircleHelp size={18} /><span>Help centre</span></button>
        <div className="side-divider" />
        <button className="account-chip" onClick={() => setPage('My profile')}>
          <span className="avatar avatar-dark">{initials(user?.name ?? 'Driver')}</span>
          <span className="account-copy"><strong>{user?.name}</strong><small>Driver account</small></span>
          <ChevronDown size={15} />
        </button>
        <button className="nav-item signout-link" onClick={logout}><X size={17} /><span>Sign out</span></button>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(!mobileNavOpen)}><Menu size={20} /></button>
        <div className="breadcrumb">Workspace <span>/</span> <strong>{page}</strong></div>
        <div className="top-actions">
          <span className="demo-pill"><span /> CONNECTED ACCOUNT</span>
          <div className="notification-wrap">
            <button className="icon-button notification-button" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} onClick={() => { setNotificationsOpen(!notificationsOpen); if (!notificationsOpen) void loadNotifications() }}><Bell size={19} />{unreadCount > 0 && <i />}</button>
            {notificationsOpen && <section className="notification-popover" aria-label="Notifications">
              <div className="notification-popover-heading"><strong>Notifications</strong>{unreadCount > 0 && <button onClick={() => void markAllNotificationsRead()}>Mark all read</button>}</div>
              {notificationsLoading ? <LoadingState label="Loading notifications…" compact /> : notifications.length === 0 ? <EmptyState title="You’re all caught up" message="New job matches and application updates will show here." compact /> : <div className="notification-items">{notifications.map((item) => <button className={`notification-item ${item.isRead ? '' : 'unread'}`} key={item.id} onClick={() => void markNotificationRead(item)}><span className="notification-dot" /><span><strong>{item.title}</strong><small>{item.message}</small><small>{dateLabel(item.createdAt)}</small></span></button>)}</div>}
            </section>}
          </div>
          <span className="avatar avatar-user">{initials(user?.name ?? 'Driver')}</span>
        </div>
      </header>

      <div className="page-content">
        <section className="welcome-row">
          <div><div className="eyebrow"><span className="eyebrow-line" />DRIVER WORKSPACE</div><h1>{heading}</h1><p className="welcome-subtitle">Good drivers make every journey better. Let’s find your next one.</p></div>
        </section>

        {page === 'Overview' && <section className="profile-banner">
          <div className="banner-mark"><Truck size={22} /></div>
          <div className="banner-copy"><strong>Your profile is {profileCompletion}% complete</strong><span>Add experience and licence details to stand out to employers.</span></div>
          <div className="progress-track"><span style={{ width: `${profileCompletion}%` }} /></div>
          <button onClick={() => setPage('My profile')}>Complete profile <ArrowRight size={15} /></button>
        </section>}

        <section className="stats-row">
          <StatCard label="MATCHING JOBS" value={jobs.length} note={jobsLoading ? 'Refreshing listings…' : 'Approved opportunities'} icon={BriefcaseBusiness} tone="green" />
          <StatCard label="APPLICATIONS" value={applications.length} note="Across your job search" icon={FileText} tone="peach" />
          <StatCard label="SAVED JOBS" value={savedJobs.length} note="Keep your shortlist close" icon={Bookmark} tone="blue" />
        </section>

        <div className="content-grid">
          <section className="jobs-panel">
            <div className="section-heading"><div><span className="section-kicker">{page === 'My profile' ? 'DRIVER DETAILS' : page === 'My applications' ? 'YOUR JOB SEARCH' : page === 'Saved jobs' ? 'YOUR SHORTLIST' : 'HANDPICKED FOR YOU'}</span><h2>{page === 'My profile' ? 'Your driver profile' : page === 'My applications' ? 'Your applications' : page === 'Saved jobs' ? 'Saved jobs' : page === 'Find jobs' ? 'Explore driver jobs' : 'Latest opportunities'}</h2></div>{showJobSearch && <button className="text-button" onClick={() => setPage('Find jobs')}>View all jobs <ArrowRight size={15} /></button>}</div>

            {actionError && <ErrorState message={actionError} onDismiss={() => setActionError('')} />}
            {accountError && <ErrorState message={accountError} onRetry={() => void loadAccountData()} />}

            {showJobSearch && <form className="filter-row driver-search-form" onSubmit={submitSearch}>
              <label className="search-box"><Search size={17} /><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search title, company, location..." /></label>
              <label className="select-box"><SlidersHorizontal size={16} /><select value={category} onChange={(event) => setCategory(event.target.value as Category)} aria-label="Driver category">{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><ChevronDown size={14} /></label>
              {page === 'Find jobs' && <label className="location-filter"><MapPin size={15} /><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location" /></label>}
              <button className="primary-button search-submit" type="submit"><Search size={15} /><span>Search</span></button>
            </form>}

            {page === 'My profile' ? <DriverProfilePanel
              profile={profile}
              documents={documents}
              loading={accountLoading}
              busy={actionBusy}
              onSave={saveProfile}
              onAddExperience={addExperience}
              onRemoveExperience={removeExperience}
              onUpload={uploadDocument}
              onDeleteDocument={deleteDocument}
            /> : page === 'Overview' || page === 'Find jobs' ? <JobResults
              jobs={jobs}
              loading={jobsLoading}
              error={jobsError}
              savedIds={savedJobIds}
              appliedIds={appliedJobIds}
              busy={actionBusy}
              onRetry={() => setJobsRetry((current) => current + 1)}
              onApply={applyToJob}
              onToggleSaved={toggleSavedJob}
              onDetails={openJobDetails}
            /> : <TrackedJobs
              page={page}
              items={jobsToShow}
              loading={accountLoading}
              onApply={applyToJob}
              onToggleSaved={toggleSavedJob}
              onDetails={openJobDetails}
              savedIds={savedJobIds}
              appliedIds={appliedJobIds}
              busy={actionBusy}
            />}
          </section>

          <aside className="right-rail">
            <section className="rail-section saved-section"><div className="rail-heading"><div><span className="section-kicker">YOUR SHORTLIST</span><h3>Saved jobs <span>{savedJobs.length}</span></h3></div><Bookmark size={18} /></div>{savedJobs.length ? savedJobs.slice(0, 3).map(({ job }) => <button className="saved-job" key={job.id} onClick={() => void openJobDetails(job.id)}><span className="mini-mark mint"><Building2 size={15} /></span><span><strong>{job.title}</strong><small>{job.employer.companyName} · {job.location}</small></span><ArrowRight size={15} /></button>) : <p className="rail-empty">Save a job to keep it close by.</p>}<button className="rail-link" onClick={() => setPage('Saved jobs')}>Open saved jobs <ArrowRight size={14} /></button></section>
            <section className="tip-card"><div className="tip-icon"><FileText size={18} /></div><span className="section-kicker">DRIVER TIP</span><h3>Make your licence do the talking.</h3><p>Add your licence class and expiry date to help employers find the right fit, faster.</p><button onClick={() => setPage('My profile')}>Update profile <ArrowRight size={14} /></button><span className="tip-decoration"><Truck size={80} /></span></section>
            <div className="rail-footer"><span>DRIVER HUB · 2026</span><button aria-label="Refresh account data" onClick={() => void loadAccountData()}><CircleHelp size={15} /></button></div>
          </aside>
        </div>
        <footer className="page-footer"><span>© 2026 Driver Hub</span><span>Built for the people who keep us moving.</span><button><CircleHelp size={14} /> Support</button></footer>
      </div>
    </main>

    {detailLoading && <div className="modal-backdrop"><section className="post-modal"><LoadingState label="Loading job details…" /></section></div>}
    {detailError && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDetailError('')}><section className="post-modal"><div className="modal-heading"><h2>Couldn’t load this job</h2><button className="icon-button" aria-label="Close" onClick={() => setDetailError('')}><X size={19} /></button></div><ErrorState message={detailError} onRetry={() => setDetailError('')} /></section></div>}
    {selectedJob && <JobDetailModal job={selectedJob} applied={appliedJobIds.has(selectedJob.id)} saved={savedJobIds.has(selectedJob.id)} busy={actionBusy} onApply={applyToJob} onToggleSaved={toggleSavedJob} onClose={() => setSelectedJob(null)} />}
    {notice && <div className="toast"><Check size={17} />{notice}<button aria-label="Dismiss" onClick={() => setNotice('')}><X size={15} /></button></div>}
    {mobileNavOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
  </div>
}

const StatCard = ({ label, value, note, icon: Icon, tone }: { label: string; value: number; note: string; icon: typeof Bookmark; tone: string }) =>
  <div className="stat-card"><span className={`stat-icon ${tone}`}><Icon size={18} /></span><div className="stat-body"><span className="stat-label">{label}</span><div className="stat-value">{String(value).padStart(2, '0')}</div><span className="stat-note">{note}</span></div></div>

const JobResults = ({ jobs, loading, error, savedIds, appliedIds, busy, onRetry, onApply, onToggleSaved, onDetails }: {
  jobs: ApiJob[]
  loading: boolean
  error: string
  savedIds: Set<string>
  appliedIds: Set<string>
  busy: string
  onRetry: () => void
  onApply: (jobId: string) => void
  onToggleSaved: (jobId: string) => void
  onDetails: (jobId: string) => void
}) => {
  if (loading) return <LoadingState label="Finding driver jobs…" />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (jobs.length === 0) return <EmptyState title="No jobs found" message="Try a different search or category to see more opportunities." />
  return <div className="job-list">{jobs.map((job, index) => <DriverJobCard key={job.id} job={job} color={jobColors[index % jobColors.length]!} saved={savedIds.has(job.id)} applied={appliedIds.has(job.id)} busy={busy} onApply={onApply} onToggleSaved={onToggleSaved} onDetails={onDetails} />)}</div>
}

const TrackedJobs = ({ page, items, loading, onApply, onToggleSaved, onDetails, savedIds, appliedIds, busy }: {
  page: DriverPage
  items: { job: ApiJob; status?: ApiApplication['status'] }[]
  loading: boolean
  onApply: (jobId: string) => void
  onToggleSaved: (jobId: string) => void
  onDetails: (jobId: string) => void
  savedIds: Set<string>
  appliedIds: Set<string>
  busy: string
}) => {
  if (loading) return <LoadingState label={page === 'Saved jobs' ? 'Loading saved jobs…' : 'Loading applications…'} />
  if (items.length === 0) return <EmptyState title={page === 'Saved jobs' ? 'No saved jobs yet' : 'No applications yet'} message={page === 'Saved jobs' ? 'Bookmark a job to keep it on your shortlist.' : 'Apply to an opportunity and you can track its progress here.'} />
  return <div className="job-list">{items.map(({ job, status }, index) => <DriverJobCard key={job.id} job={job} color={jobColors[index % jobColors.length]!} saved={savedIds.has(job.id)} applied={appliedIds.has(job.id)} status={status} busy={busy} onApply={onApply} onToggleSaved={onToggleSaved} onDetails={onDetails} />)}</div>
}

const DriverJobCard = ({ job, color, saved, applied, status, busy, onApply, onToggleSaved, onDetails }: {
  job: ApiJob
  color: string
  saved: boolean
  applied: boolean
  status?: string
  busy: string
  onApply: (jobId: string) => void
  onToggleSaved: (jobId: string) => void
  onDetails: (jobId: string) => void
}) => <article className="job-card">
  <span className={`company-mark ${color}`}><Building2 size={20} /></span>
  <div className="job-main"><div className="job-company-line"><span>{job.employer.companyName}</span><span className="job-posted">{dateLabel(job.createdAt)}</span></div><button className="job-title-button" onClick={() => onDetails(job.id)}>{job.title}</button><div className="job-meta"><span><MapPin size={14} />{job.location}</span><span><Truck size={14} />{categoryLabel(job.driverCategory)}</span><span><Clock3 size={14} />{job.workingHours ?? 'Hours not specified'}</span></div><div className="job-bottom"><span className="salary"><Wallet size={14} />{formatSalary(job)}</span><span className="experience">{job.experienceRequired > 0 ? `${job.experienceRequired}+ years` : 'Entry level'}</span>{status && <span className={`status-tag status-${status.toLowerCase()}`}>{status.replace('_', ' ')}</span>}</div></div>
  <div className="job-actions"><button className={`apply-button ${applied ? 'applied' : ''}`} disabled={applied || busy === `apply-${job.id}`} onClick={() => onApply(job.id)}>{applied ? <><Check size={15} /> Applied</> : busy === `apply-${job.id}` ? 'Sending…' : 'Apply now'}</button><button className={`save-button ${saved ? 'saved' : ''}`} aria-label={saved ? 'Remove saved job' : 'Save job'} disabled={busy === `save-${job.id}`} onClick={() => onToggleSaved(job.id)}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /></button></div>
  <button className="job-detail-link" onClick={() => onDetails(job.id)}>Job details <ArrowRight size={13} /></button>
</article>

const DriverProfilePanel = ({ profile, documents, loading, busy, onSave, onAddExperience, onRemoveExperience, onUpload, onDeleteDocument }: {
  profile: DriverProfile | null
  documents: ApiDocument[]
  loading: boolean
  busy: string
  onSave: (event: FormEvent<HTMLFormElement>) => void
  onAddExperience: (event: FormEvent<HTMLFormElement>) => void
  onRemoveExperience: (id: string) => void
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onDeleteDocument: (id: string) => void
}) => {
  if (loading && !profile) return <LoadingState label="Loading your driver profile…" />
  if (!profile) return <EmptyState title="Profile unavailable" message="Your driver profile could not be loaded." />
  return <div className="profile-panel driver-profile-panel">
    <div className="profile-head"><span className="avatar avatar-large avatar-user">{initials(profile.user?.name ?? 'Driver')}</span><div><strong>{profile.user?.name ?? 'Driver'}</strong><span>{profile.location ?? 'Add your location'} · Driver profile</span></div><span className={`profile-visibility ${profile.isProfilePublic ? 'visible' : ''}`}>{profile.isProfilePublic ? 'PUBLIC' : 'PRIVATE'}</span></div>
    <form className="driver-profile-form" onSubmit={onSave} key={profile.userId}>
      <div className="profile-form-grid">
        <label>Location<input name="location" defaultValue={profile.location ?? ''} placeholder="City, Province" /></label>
        <label>Date of birth<input name="dob" type="date" defaultValue={profile.dob?.slice(0, 10) ?? ''} /></label>
        <label>Licence class<input name="licenseType" defaultValue={profile.licenseType ?? ''} placeholder="e.g. AZ, DZ, Class 5" /></label>
        <label>Licence number<input name="licenseNumber" defaultValue={profile.licenseNumber ?? ''} placeholder="Licence number" /></label>
        <label>Licence expiry<input name="licenseExpiry" type="date" defaultValue={profile.licenseExpiry?.slice(0, 10) ?? ''} /></label>
        <label>Years of experience<input name="totalExperienceYears" type="number" min="0" max="70" step="0.5" defaultValue={profile.totalExperienceYears} /></label>
        <label>Expected annual salary<input name="expectedSalary" type="number" min="0" defaultValue={profile.expectedSalary ?? ''} placeholder="e.g. 65000" /></label>
        <label>Availability<input name="availability" defaultValue={profile.availability ?? ''} placeholder="Immediately, two weeks…" /></label>
        <label className="form-grid-wide">Skills <small>Comma-separated</small><input name="skills" defaultValue={profile.skills.join(', ')} placeholder="Long haul, defensive driving" /></label>
        <label className="form-grid-wide">Preferred categories <small>Comma-separated API categories</small><input name="preferredCategories" defaultValue={profile.preferredCategories.join(', ')} placeholder="TRUCK, DELIVERY" /></label>
        <label className="form-grid-wide">About you<textarea name="bio" rows={4} defaultValue={profile.bio ?? ''} placeholder="Driving experience, strengths, and the work you’re looking for" /></label>
      </div>
      <label className="public-profile-toggle"><input name="isProfilePublic" type="checkbox" defaultChecked={profile.isProfilePublic} /><span>Make my profile visible to employers</span></label>
      <div className="company-form-actions"><span>Profile information is only shown according to its visibility setting.</span><button className="primary-button" disabled={busy === 'profile'}>{busy === 'profile' ? 'Saving…' : <><Check size={16} /> Save profile</>}</button></div>
    </form>

    <section className="profile-subsection"><div className="subsection-heading"><div><span className="section-kicker">WORK HISTORY</span><h3>Driving experience</h3></div></div>
      {profile.experiences?.length ? <div className="experience-list">{profile.experiences.map((experience) => <ExperienceRow key={experience.id} experience={experience} busy={busy} onRemove={onRemoveExperience} />)}</div> : <p className="inline-empty">Add your previous driving work to help employers understand your experience.</p>}
      <form className="experience-form" onSubmit={onAddExperience}><label>Vehicle type<input name="vehicleType" required placeholder="e.g. Tractor trailer" /></label><label>Employer<input name="employerName" required placeholder="Company name" /></label><label>Years<input name="years" type="number" min="0" max="70" step="0.5" required placeholder="2" /></label><label className="experience-notes">Notes<input name="notes" placeholder="Routes, responsibilities…" /></label><button className="quiet-button" disabled={busy === 'experience'}><span><Check size={15} /> Add experience</span></button></form>
    </section>

    <section className="profile-subsection documents-section"><div className="subsection-heading"><div><span className="section-kicker">VERIFICATION</span><h3>Resume & documents</h3></div><label className={`upload-document-button ${busy === 'document' ? 'disabled' : ''}`}><FileText size={15} />{busy === 'document' ? 'Uploading…' : 'Upload file'}<input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" disabled={busy === 'document'} onChange={onUpload} /></label></div>
      {documents.length ? <div className="document-list">{documents.map((document) => <div className="document-row" key={document.id}><FileText size={17} /><span><strong>{document.fileName}</strong><small>{document.type.replace('_', ' ')} · {dateLabel(document.uploadedAt)}</small></span><button className="icon-button" aria-label={`Delete ${document.fileName}`} disabled={busy === `document-${document.id}`} onClick={() => onDeleteDocument(document.id)}><X size={16} /></button></div>)}</div> : <p className="inline-empty">No documents uploaded. PDF, DOC, DOCX, JPG, or PNG up to 10 MB.</p>}
    </section>
  </div>
}

const ExperienceRow = ({ experience, busy, onRemove }: { experience: DriverExperience; busy: string; onRemove: (id: string) => void }) =>
  <div className="experience-row"><span className="experience-mark"><Truck size={17} /></span><span><strong>{experience.vehicleType} · {experience.employerName}</strong><small>{experience.years} years{experience.notes ? ` · ${experience.notes}` : ''}</small></span><button className="icon-button" aria-label={`Remove experience at ${experience.employerName}`} disabled={busy === `experience-${experience.id}`} onClick={() => onRemove(experience.id)}><X size={16} /></button></div>

const JobDetailModal = ({ job, applied, saved, busy, onApply, onToggleSaved, onClose }: {
  job: ApiJob
  applied: boolean
  saved: boolean
  busy: string
  onApply: (jobId: string) => void
  onToggleSaved: (jobId: string) => void
  onClose: () => void
}) => <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="post-modal job-detail-modal" role="dialog" aria-modal="true" aria-labelledby="job-detail-title">
  <div className="modal-heading"><div><span className="section-kicker">{job.employer.companyName}</span><h2 id="job-detail-title">{job.title}</h2></div><button className="icon-button" aria-label="Close job details" onClick={onClose}><X size={19} /></button></div>
  <div className="detail-meta"><span><MapPin size={15} />{job.location}</span><span><Truck size={15} />{categoryLabel(job.driverCategory)}</span><span><Wallet size={15} />{formatSalary(job)}</span><span><Clock3 size={15} />{job.workingHours ?? 'Hours not specified'}</span></div>
  <section className="job-description"><h3>About this role</h3><p>{job.description}</p><h3>Experience</h3><p>{job.experienceRequired > 0 ? `${job.experienceRequired} years required` : 'Entry-level applicants welcome'}</p>{job.requiredDocuments.length > 0 && <><h3>Required documents</h3><p>{job.requiredDocuments.join(', ')}</p></>}</section>
  <div className="modal-actions"><button className={`save-button ${saved ? 'saved' : ''}`} aria-label={saved ? 'Remove saved job' : 'Save job'} onClick={() => onToggleSaved(job.id)}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /></button><button className={`apply-button ${applied ? 'applied' : ''}`} disabled={applied || busy === `apply-${job.id}`} onClick={() => onApply(job.id)}>{applied ? <><Check size={15} /> Applied</> : 'Apply now'}</button></div>
</section></div>

const LoadingState = ({ label, compact = false }: { label: string; compact?: boolean }) => <div className={`state-panel loading-state ${compact ? 'compact-state' : ''}`} role="status"><span className="loading-spinner" />{label}</div>

const EmptyState = ({ title, message, compact = false }: { title: string; message: string; compact?: boolean }) => <div className={`state-panel empty-state ${compact ? 'compact-state' : ''}`}><Search size={compact ? 18 : 24} /><strong>{title}</strong><span>{message}</span></div>

const ErrorState = ({ message, onRetry, onDismiss }: { message: string; onRetry?: () => void; onDismiss?: () => void }) => <div className="api-error" role="alert"><span>{message}</span>{onRetry && <button className="text-button" onClick={onRetry}>Try again</button>}{onDismiss && <button className="icon-button" aria-label="Dismiss error" onClick={onDismiss}><X size={15} /></button>}</div>