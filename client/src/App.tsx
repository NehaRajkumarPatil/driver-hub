import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownUp,
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
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import './App.css'

type Role = 'Driver' | 'Employer' | 'Admin'
type Job = {
  id: number
  title: string
  company: string
  location: string
  category: string
  salary: string
  schedule: string
  experience: string
  posted: string
  color: string
  approved: boolean
}
type Application = { jobId: number; status: string; date: string }

const starterJobs: Job[] = [
  { id: 1, title: 'Class 1 Long Haul Driver', company: 'Northstar Freight', location: 'Toronto, ON', category: 'Class 1', salary: '$32–$38 / hr', schedule: 'Full-time · Day shift', experience: '2+ years', posted: '2 hours ago', color: 'mint', approved: true },
  { id: 2, title: 'Local Delivery Driver', company: 'Goodwell Supply Co.', location: 'Mississauga, ON', category: 'Class 3', salary: '$28–$31 / hr', schedule: 'Full-time · Weekdays', experience: '1+ year', posted: '5 hours ago', color: 'peach', approved: true },
  { id: 3, title: 'School Bus Driver', company: 'Cedar Valley Schools', location: 'Brampton, ON', category: 'Class B', salary: '$25–$29 / hr', schedule: 'Part-time · Split shift', experience: 'Training provided', posted: 'Yesterday', color: 'blue', approved: true },
  { id: 4, title: 'Regional Truck Driver', company: 'Maple Route Logistics', location: 'Hamilton, ON', category: 'Class 1', salary: '$30–$35 / hr', schedule: 'Full-time · Flexible', experience: '2+ years', posted: 'Yesterday', color: 'yellow', approved: true },
  { id: 5, title: 'Forklift & Yard Operator', company: 'Harbourline Warehousing', location: 'Oakville, ON', category: 'Forklift', salary: '$27–$30 / hr', schedule: 'Full-time · Night shift', experience: '1+ year', posted: '2 days ago', color: 'lavender', approved: true },
]

const sampleApplicants = [
  { initials: 'JM', name: 'Jordan Miller', detail: 'Class 1 · 6 years experience', license: 'AZ', color: 'peach' },
  { initials: 'RK', name: 'Riley Khan', detail: 'Class 1 · 4 years experience', license: 'AZ', color: 'mint' },
  { initials: 'AP', name: 'Alex Park', detail: 'Class 3 · 8 years experience', license: 'DZ', color: 'blue' },
]

const readStore = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(`driver-hub-${key}`)
    return stored ? JSON.parse(stored) as T : fallback
  } catch {
    return fallback
  }
}

function App() {
  const [role, setRole] = useState<Role>('Driver')
  const [page, setPage] = useState('Overview')
  const [jobs, setJobs] = useState<Job[]>(() => readStore('jobs', starterJobs))
  const [applications, setApplications] = useState<Application[]>(() => readStore('applications', []))
  const [savedJobs, setSavedJobs] = useState<number[]>(() => readStore('saved-jobs', []))
  const [companyProfile, setCompanyProfile] = useState(() => readStore('company-profile', {
    name: 'Northstar Freight',
    location: 'Toronto, ON',
    website: 'northstarfreight.ca',
    fleet: '42 trucks',
    about: 'A family-run carrier connecting Ontario businesses since 1998.',
  }))
  const [shortlisted, setShortlisted] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All categories')
  const [showPostForm, setShowPostForm] = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => localStorage.setItem('driver-hub-jobs', JSON.stringify(jobs)), [jobs])
  useEffect(() => localStorage.setItem('driver-hub-applications', JSON.stringify(applications)), [applications])
  useEffect(() => localStorage.setItem('driver-hub-saved-jobs', JSON.stringify(savedJobs)), [savedJobs])
  useEffect(() => localStorage.setItem('driver-hub-company-profile', JSON.stringify(companyProfile)), [companyProfile])

  const navItems = role === 'Driver'
    ? [{ label: 'Overview', icon: LayoutDashboard }, { label: 'Find jobs', icon: Search }, { label: 'My applications', icon: FileText }, { label: 'My profile', icon: Users }]
    : role === 'Employer'
      ? [{ label: 'Overview', icon: LayoutDashboard }, { label: 'My job posts', icon: BriefcaseBusiness }, { label: 'Applicants', icon: Users }, { label: 'Company profile', icon: Building2 }]
      : [{ label: 'Overview', icon: LayoutDashboard }, { label: 'Job approvals', icon: ShieldCheck }, { label: 'Users', icon: Users }, { label: 'Applications', icon: FileText }]

  const filteredJobs = useMemo(() => jobs.filter((job) => {
    const matchesText = `${job.title} ${job.company} ${job.location} ${job.category}`.toLowerCase().includes(query.toLowerCase())
    return matchesText && (category === 'All categories' || job.category === category) && (role !== 'Admin' || !job.approved)
  }), [jobs, query, category, role])
  const applicationFor = (jobId: number) => applications.find((application) => application.jobId === jobId)
  const visibleJobs = role === 'Driver' && page === 'My applications'
    ? jobs.filter((job) => applicationFor(job.id))
    : role === 'Employer' && page === 'My job posts'
      ? jobs.filter((job) => job.company === companyProfile.name)
      : filteredJobs

  const changeRole = (nextRole: Role) => {
    setRole(nextRole)
    setPage('Overview')
    setQuery('')
    setShowMobileNav(false)
  }

  const toggleSave = (jobId: number) => {
    setSavedJobs((current) => current.includes(jobId) ? current.filter((id) => id !== jobId) : [...current, jobId])
  }

  const applyToJob = (jobId: number) => {
    if (applicationFor(jobId)) return
    setApplications((current) => [...current, { jobId, status: 'Under review', date: new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) }])
    setNotice('Application sent. You can track it in My applications.')
    window.setTimeout(() => setNotice(''), 3200)
  }

  const postJob = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const nextJob: Job = {
      id: Date.now(),
      title: String(form.get('title')),
      company: companyProfile.name,
      location: String(form.get('location')),
      category: String(form.get('category')),
      salary: String(form.get('salary')),
      schedule: String(form.get('schedule')),
      experience: String(form.get('experience')),
      posted: 'Just now',
      color: 'mint',
      approved: role === 'Admin',
    }
    setJobs((current) => [nextJob, ...current])
    setShowPostForm(false)
    setNotice(role === 'Admin' ? 'Job approved and published.' : 'Job submitted for admin approval.')
    window.setTimeout(() => setNotice(''), 3200)
  }

  const saveCompanyProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setCompanyProfile({
      name: String(form.get('company-name')),
      location: String(form.get('company-location')),
      website: String(form.get('company-website')),
      fleet: String(form.get('company-fleet')),
      about: String(form.get('company-about')),
    })
    setNotice('Company profile updated.')
    window.setTimeout(() => setNotice(''), 3200)
  }

  const approveJob = (jobId: number) => {
    setJobs((current) => current.map((job) => job.id === jobId ? { ...job, approved: true } : job))
  }

  const toggleShortlist = (name: string) => {
    setShortlisted((current) => current.includes(name) ? current.filter((candidate) => candidate !== name) : [...current, name])
  }

  const heading = page === 'Overview'
    ? role === 'Driver' ? 'Your next drive starts here.' : role === 'Employer' ? 'Find your next great driver.' : 'Good morning, Admin.'
    : page

  return (
    <div className="app-shell">
      <aside className={`sidebar ${showMobileNav ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#home" onClick={() => setPage('Overview')}>
          <span className="brand-mark"><Truck size={20} strokeWidth={2.2} /></span>
          <span>driver<span className="brand-dot">.</span>hub</span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <div className="role-switch" aria-label="Choose demo role">
          {(['Driver', 'Employer', 'Admin'] as Role[]).map((item) => (
            <button key={item} className={role === item ? 'role-active' : ''} onClick={() => changeRole(item)}>{item}</button>
          ))}
        </div>
        <div className="side-caption">MENU</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${page === label ? 'nav-active' : ''}`} onClick={() => { setPage(label); setShowMobileNav(false) }}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {label === 'My applications' && applications.length > 0 && <span className="nav-count">{applications.length}</span>}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <button className="nav-item"><CircleHelp size={18} /><span>Help centre</span></button>
          <div className="side-divider" />
          <button className="account-chip" onClick={() => setPage(role === 'Driver' ? 'My profile' : 'Company profile')}>
            <span className="avatar avatar-dark">{role === 'Driver' ? 'JD' : role === 'Employer' ? 'NF' : 'AD'}</span>
            <span className="account-copy"><strong>{role === 'Driver' ? 'Jamie Davis' : role === 'Employer' ? 'Northstar Freight' : 'Admin User'}</strong><small>{role} account</small></span>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setShowMobileNav(!showMobileNav)}><Menu size={20} /></button>
          <div className="breadcrumb">Workspace <span>/</span> <strong>{page}</strong></div>
          <div className="top-actions">
            <span className="demo-pill"><span /> DEMO ACCOUNT</span>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice('You are all caught up.') }><Bell size={19} /><i /></button>
            <span className="avatar avatar-user">JD</span>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />{role === 'Driver' ? 'WEDNESDAY, SEPTEMBER 30' : role === 'Employer' ? 'EMPLOYER DASHBOARD' : 'PLATFORM OVERVIEW'}</div>
              <h1>{heading}</h1>
              <p className="welcome-subtitle">{role === 'Driver' ? 'Good drivers make every journey better. Let’s find your next one.' : role === 'Employer' ? 'A better hire makes every mile count.' : 'Here’s what’s happening across Driver Hub today.'}</p>
            </div>
            {role === 'Employer' && <button className="primary-button" onClick={() => setShowPostForm(true)}><Plus size={17} /> Post a job</button>}
            {role === 'Admin' && <button className="quiet-button" onClick={() => setPage('Job approvals')}><ShieldCheck size={16} /> Review queue</button>}
          </section>

          {role === 'Driver' && page === 'Overview' && <section className="profile-banner">
            <div className="banner-mark"><Truck size={22} /></div>
            <div className="banner-copy"><strong>Your profile is 70% complete</strong><span>Add your licence details to stand out to employers.</span></div>
            <div className="progress-track"><span /></div>
            <button onClick={() => setPage('My profile')}>Complete profile <ArrowRight size={15} /></button>
          </section>}

          <section className="stats-row">
            {(role === 'Driver' ? [
              { label: 'MATCHING JOBS', value: '24', note: '+6 new this week', icon: BriefcaseBusiness, tone: 'green' },
              { label: 'APPLICATIONS', value: String(applications.length).padStart(2, '0'), note: applications.length ? 'Across your job search' : 'Ready when you are', icon: FileText, tone: 'peach' },
              { label: 'SAVED JOBS', value: String(savedJobs.length).padStart(2, '0'), note: 'Keep your shortlist close', icon: Bookmark, tone: 'blue' },
            ] : role === 'Employer' ? [
              { label: 'ACTIVE JOB POSTS', value: '04', note: '2 closing this week', icon: BriefcaseBusiness, tone: 'green' },
              { label: 'NEW APPLICANTS', value: '12', note: 'Across all job posts', icon: Users, tone: 'peach' },
              { label: 'SHORTLISTED', value: String(shortlisted.length).padStart(2, '0'), note: 'Ready for next steps', icon: Check, tone: 'blue' },
            ] : [
              { label: 'ACTIVE JOBS', value: String(jobs.filter((job) => job.approved).length).padStart(2, '0'), note: 'Published on the platform', icon: BriefcaseBusiness, tone: 'green' },
              { label: 'PENDING APPROVAL', value: String(jobs.filter((job) => !job.approved).length).padStart(2, '0'), note: 'Waiting for your review', icon: ShieldCheck, tone: 'peach' },
              { label: 'APPLICATIONS', value: String(applications.length + 128), note: 'Submitted by candidates', icon: FileText, tone: 'blue' },
            ]).map(({ label, value, note, icon: Icon, tone }) => (
              <div className="stat-card" key={label}><span className={`stat-icon ${tone}`}><Icon size={18} /></span><div className="stat-body"><span className="stat-label">{label}</span><div className="stat-value">{value}</div><span className="stat-note">{note}</span></div></div>
            ))}
          </section>

          <div className="content-grid">
            <section className="jobs-panel">
              <div className="section-heading">
                <div><span className="section-kicker">{role === 'Admin' ? 'MODERATION' : role === 'Employer' ? page === 'Company profile' ? 'COMPANY SETTINGS' : 'TALENT BOARD' : 'HANDPICKED FOR YOU'}</span><h2>{role === 'Admin' ? page === 'Job approvals' ? 'Jobs awaiting approval' : 'Platform activity' : role === 'Employer' ? page === 'Applicants' ? 'Recent applicants' : page === 'My job posts' ? 'Your active job posts' : page === 'Company profile' ? 'Company details' : 'Drivers ready to roll' : page === 'My applications' ? 'Your applications' : page === 'My profile' ? 'Your driver profile' : page === 'Find jobs' ? 'Explore driver jobs' : 'Latest opportunities'}</h2></div>
                {role !== 'Admin' && role !== 'Employer' && <button className="text-button" onClick={() => setPage('Find jobs')}>View all jobs <ArrowRight size={15} /></button>}
                {role === 'Employer' && page !== 'Applicants' && <button className="text-button" onClick={() => setShowPostForm(true)}><Plus size={15} /> New post</button>}
              </div>

              {(role === 'Driver' || role === 'Admin') && page !== 'My profile' && page !== 'Applications' && <div className="filter-row">
                <label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, company, location..." /></label>
                <label className="select-box"><SlidersHorizontal size={16} /><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option><option>Class 1</option><option>Class 3</option><option>Class B</option><option>Forklift</option></select><ChevronDown size={14} /></label>
              </div>}

              {role === 'Employer' && page === 'Applicants' ? <div className="applicant-list">
                {sampleApplicants.map((candidate) => <div className="applicant-row" key={candidate.name}><span className={`avatar avatar-large ${candidate.color}`}>{candidate.initials}</span><div className="applicant-info"><strong>{candidate.name}</strong><span>{candidate.detail}</span></div><span className="license-tag">{candidate.license}</span><button className={`shortlist-button ${shortlisted.includes(candidate.name) ? 'shortlisted' : ''}`} onClick={() => toggleShortlist(candidate.name)}>{shortlisted.includes(candidate.name) ? <><Check size={14} /> Shortlisted</> : <><Plus size={14} /> Shortlist</>}</button></div>)}
              </div> : role === 'Employer' && page === 'Company profile' ? <div className="profile-panel"><form className="company-profile-form" onSubmit={saveCompanyProfile}><div className="company-form-row"><label>Company name<input name="company-name" required defaultValue={companyProfile.name} /></label><label>Location<input name="company-location" required defaultValue={companyProfile.location} /></label></div><div className="company-form-row"><label>Website<input name="company-website" defaultValue={companyProfile.website} /></label><label>Fleet size<input name="company-fleet" defaultValue={companyProfile.fleet} /></label></div><label>About your company<textarea name="company-about" rows={4} defaultValue={companyProfile.about} /></label><div className="company-form-actions"><span><Building2 size={15} /> Visible to drivers on your job posts</span><button className="primary-button" type="submit"><Check size={16} /> Save profile</button></div></form></div> : role === 'Driver' && page === 'My profile' ? <div className="profile-panel"><div className="profile-head"><span className="avatar avatar-large avatar-user">JD</span><div><strong>Jamie Davis</strong><span>Professional driver · Toronto, ON</span></div><button className="quiet-button" onClick={() => setNotice('Profile editing will be available in the full account flow.')}>Edit profile</button></div><div className="profile-details"><div><span>LICENCE CLASS</span><strong>Class 1 (AZ)</strong></div><div><span>EXPERIENCE</span><strong>6 years</strong></div><div><span>AVAILABILITY</span><strong>Immediately</strong></div></div><label className="upload-line"><FileText size={18} /><span><strong>Resume & documents</strong><small>PDF, DOC up to 10 MB</small></span><input type="file" accept=".pdf,.doc,.docx" onChange={(event) => event.target.files?.[0] && setNotice(`${event.target.files[0].name} added to your profile.`)} /><span className="upload-action">Upload <ArrowRight size={14} /></span></label></div> : role === 'Admin' && page === 'Users' ? <div className="empty-state"><Users size={24} /><strong>User management</strong><span>Candidate and employer accounts are active in this demo workspace.</span></div> : role === 'Admin' && page === 'Applications' ? <div className="empty-state"><FileText size={24} /><strong>Application overview</strong><span>{applications.length} demo application{applications.length === 1 ? '' : 's'} submitted by candidates.</span></div> : visibleJobs.length ? <div className="job-list">
                {visibleJobs.map((job) => {
                  const application = applicationFor(job.id)
                  return <article className="job-card" key={job.id}>
                    <span className={`company-mark ${job.color}`}><Building2 size={20} /></span>
                    <div className="job-main"><div className="job-company-line"><span>{job.company}</span><span className="job-posted">{job.posted}</span></div><h3>{job.title}</h3><div className="job-meta"><span><MapPin size={14} />{job.location}</span><span><Truck size={14} />{job.category}</span><span><Clock3 size={14} />{job.schedule.split('·')[0].trim()}</span></div><div className="job-bottom"><span className="salary"><Wallet size={14} />{job.salary}</span><span className="experience">{job.experience}</span></div></div>
                    <div className="job-actions">
                      {role === 'Admin' ? <button className="primary-button compact" onClick={() => approveJob(job.id)}><Check size={15} /> Approve</button> : role === 'Employer' ? <button className="quiet-button compact" onClick={() => setPage('Applicants')}><Users size={15} /> Applicants</button> : <button className={`apply-button ${application ? 'applied' : ''}`} onClick={() => applyToJob(job.id)}>{application ? <><Check size={15} /> Applied</> : 'Apply now'}</button>}
                      {role === 'Driver' && <button className={`save-button ${savedJobs.includes(job.id) ? 'saved' : ''}`} aria-label={savedJobs.includes(job.id) ? 'Remove saved job' : 'Save job'} onClick={() => toggleSave(job.id)}><Bookmark size={17} fill={savedJobs.includes(job.id) ? 'currentColor' : 'none'} /></button>}
                    </div>
                    {role === 'Admin' && <span className="pending-label">Pending review</span>}
                    {application && role === 'Driver' && <span className="application-status">{application.status} · {application.date}</span>}
                  </article>
                })}
              </div> : <div className="empty-state"><Search size={24} /><strong>No jobs found</strong><span>Try another search or category.</span><button className="text-button" onClick={() => { setQuery(''); setCategory('All categories') }}>Clear filters</button></div>}
            </section>

            <aside className="right-rail">
              {role === 'Driver' ? <>
                <section className="rail-section saved-section"><div className="rail-heading"><div><span className="section-kicker">YOUR SHORTLIST</span><h3>Saved jobs <span>{savedJobs.length}</span></h3></div><Bookmark size={18} /></div>{savedJobs.length ? jobs.filter((job) => savedJobs.includes(job.id)).slice(0, 3).map((job) => <button className="saved-job" key={job.id} onClick={() => setQuery(job.title)}><span className={`mini-mark ${job.color}`}><Building2 size={15} /></span><span><strong>{job.title}</strong><small>{job.company} · {job.location}</small></span><ArrowRight size={15} /></button>) : <p className="rail-empty">Save a job to keep it close by.</p>}</section>
                <section className="tip-card"><div className="tip-icon"><FileText size={18} /></div><span className="section-kicker">DRIVER TIP</span><h3>Make your licence do the talking.</h3><p>Add your licence class and expiry date to help employers find the right fit, faster.</p><button onClick={() => setPage('My profile')}>Update profile <ArrowRight size={14} /></button><span className="tip-decoration"><Truck size={80} /></span></section>
              </> : role === 'Employer' ? <>
                <section className="rail-section"><div className="rail-heading"><div><span className="section-kicker">YOUR PIPELINE</span><h3>Hiring activity</h3></div><ArrowDownUp size={17} /></div><div className="pipeline-item"><span className="pipeline-dot green-dot" /><span>New applications</span><strong>12</strong></div><div className="pipeline-item"><span className="pipeline-dot yellow-dot" /><span>Under review</span><strong>8</strong></div><div className="pipeline-item"><span className="pipeline-dot blue-dot" /><span>Shortlisted</span><strong>{shortlisted.length}</strong></div><button className="rail-link" onClick={() => setPage('Applicants')}>Open applicant list <ArrowRight size={14} /></button></section>
                <section className="tip-card employer-tip"><div className="tip-icon"><Users size={18} /></div><span className="section-kicker">HIRING NOTE</span><h3>Good details bring good drivers.</h3><p>Clear pay, schedule, and licence requirements help the right people find your post.</p><button onClick={() => setShowPostForm(true)}>Post a vacancy <ArrowRight size={14} /></button><span className="tip-decoration"><Truck size={80} /></span></section>
              </> : <>
                <section className="rail-section"><div className="rail-heading"><div><span className="section-kicker">NEEDS ATTENTION</span><h3>Moderation queue</h3></div><ShieldCheck size={18} /></div><div className="queue-summary"><span>{jobs.filter((job) => !job.approved).length}</span><p>job posts waiting for review</p></div><button className="rail-link" onClick={() => setPage('Job approvals')}>Review pending jobs <ArrowRight size={14} /></button></section>
                <section className="tip-card admin-tip"><div className="tip-icon"><Settings2 size={18} /></div><span className="section-kicker">ADMIN TOOLS</span><h3>Keep the network moving.</h3><p>Review new postings to keep opportunities relevant and trustworthy.</p><button onClick={() => setPage('Job approvals')}>Open review queue <ArrowRight size={14} /></button><span className="tip-decoration"><Truck size={80} /></span></section>
              </>}
              <div className="rail-footer"><span>DRIVER HUB · 2026</span><button aria-label="Settings"><Settings2 size={15} /></button></div>
            </aside>
          </div>
          <footer className="page-footer"><span>© 2026 Driver Hub</span><span>Built for the people who keep us moving.</span><button><CircleHelp size={14} /> Support</button></footer>
        </div>
      </main>

      {showPostForm && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowPostForm(false)}><section className="post-modal" role="dialog" aria-modal="true" aria-labelledby="post-title"><div className="modal-heading"><div><span className="section-kicker">NEW OPPORTUNITY</span><h2 id="post-title">Post a driver job</h2></div><button className="icon-button" aria-label="Close" onClick={() => setShowPostForm(false)}><X size={19} /></button></div><form onSubmit={postJob}><label>Job title<input name="title" required placeholder="e.g. Class 1 Long Haul Driver" /></label><div className="form-row"><label>Licence category<select name="category"><option>Class 1</option><option>Class 3</option><option>Class B</option><option>Forklift</option></select></label><label>Location<input name="location" required placeholder="City, Province" /></label></div><div className="form-row"><label>Salary range<input name="salary" required placeholder="$28–$32 / hr" /></label><label>Experience required<input name="experience" required placeholder="e.g. 2+ years" /></label></div><label>Schedule<input name="schedule" required placeholder="Full-time · Day shift" /></label><div className="modal-actions"><button type="button" className="quiet-button" onClick={() => setShowPostForm(false)}>Cancel</button><button type="submit" className="primary-button"><Plus size={16} /> Publish job</button></div></form></section></div>}
      {notice && <div className="toast"><Check size={17} />{notice}<button aria-label="Dismiss" onClick={() => setNotice('')}><X size={15} /></button></div>}
      {showMobileNav && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setShowMobileNav(false)} />}
    </div>
  )
}

export default App
