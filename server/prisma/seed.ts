import bcrypt from 'bcrypt'
import { ApplicationStatus, DriverCategory, JobStatus, PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()
const passwordHash = (password: string) => bcrypt.hash(password, 12)

const main = async () => {
  const [adminPassword, employerPassword, driverPassword] = await Promise.all([
    passwordHash('Admin@123'),
    passwordHash('Employer@123'),
    passwordHash('Driver@123'),
  ])

  await prisma.user.upsert({
    where: { email: 'admin@driverhub.com' },
    update: { name: 'Driver Hub Admin', passwordHash: adminPassword, role: UserRole.ADMIN },
    create: {
      name: 'Driver Hub Admin',
      email: 'admin@driverhub.com',
      phone: '+1-416-555-0100',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  })

  const employerInputs = [
    { name: 'Morgan Lee', email: 'hiring@northstarfreight.com', phone: '+1-416-555-0121', companyName: 'Northstar Freight', location: 'Toronto, ON', industry: 'Logistics', website: 'northstarfreight.example' },
    { name: 'Taylor Singh', email: 'jobs@goodwellsupply.com', phone: '+1-905-555-0134', companyName: 'Goodwell Supply Co.', location: 'Mississauga, ON', industry: 'Wholesale distribution', website: 'goodwellsupply.example' },
  ]

  const employers = await Promise.all(employerInputs.map((input) => {
    const profile = {
      companyName: input.companyName,
      location: input.location,
      industry: input.industry,
      website: input.website,
    }

    return prisma.user.upsert({
      where: { email: input.email },
      update: {
        name: input.name,
        passwordHash: employerPassword,
        role: UserRole.EMPLOYER,
        employerProfile: { upsert: { create: profile, update: profile } },
      },
      create: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash: employerPassword,
        role: UserRole.EMPLOYER,
        employerProfile: { create: profile },
      },
    })
  }))

  const driverInputs = [
    { name: 'Jamie Davis', email: 'jamie@driverhub.com', phone: '+1-416-555-0140', location: 'Toronto, ON', licenseType: 'AZ', years: 6, skills: ['Long haul', 'Safety compliance'], preferred: ['TRUCK', 'HEAVY'] },
    { name: 'Jordan Miller', email: 'jordan@driverhub.com', phone: '+1-647-555-0141', location: 'Mississauga, ON', licenseType: 'AZ', years: 4, skills: ['Flatbed', 'Cross-border'], preferred: ['TRUCK', 'DELIVERY'] },
    { name: 'Riley Khan', email: 'riley@driverhub.com', phone: '+1-905-555-0142', location: 'Brampton, ON', licenseType: 'DZ', years: 3, skills: ['Local delivery', 'Forklift'], preferred: ['DELIVERY', 'TRUCK'] },
    { name: 'Alex Park', email: 'alex@driverhub.com', phone: '+1-780-555-0143', location: 'Edmonton, AB', licenseType: 'Class 4', years: 8, skills: ['Passenger transport', 'Accessible vehicles'], preferred: ['BUS', 'PERSONAL'] },
    { name: 'Casey Morgan', email: 'casey@driverhub.com', phone: '+1-403-555-0144', location: 'Calgary, AB', licenseType: 'Class 5', years: 5, skills: ['City driving', 'Defensive driving'], preferred: ['TAXI', 'CAR'] },
  ]

  const drivers = await Promise.all(driverInputs.map((input) => {
    const profile = {
      location: input.location,
      licenseType: input.licenseType,
      totalExperienceYears: input.years,
      skills: input.skills,
      preferredCategories: input.preferred,
      availability: 'Immediately',
      isProfilePublic: true,
    }

    return prisma.user.upsert({
      where: { email: input.email },
      update: {
        name: input.name,
        passwordHash: driverPassword,
        role: UserRole.DRIVER,
        driverProfile: { upsert: { create: profile, update: profile } },
      },
      create: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash: driverPassword,
        role: UserRole.DRIVER,
        driverProfile: { create: profile },
      },
    })
  }))

  const jobInputs = [
    { title: 'Long Haul AZ Driver', driverCategory: DriverCategory.TRUCK, description: 'Regional and cross-border routes with modern equipment.', location: 'Toronto, ON', salaryMin: 32, salaryMax: 38, experienceRequired: 2, employerIndex: 0, status: JobStatus.APPROVED },
    { title: 'Local Delivery Driver', driverCategory: DriverCategory.DELIVERY, description: 'Deliver wholesale orders across the GTA.', location: 'Mississauga, ON', salaryMin: 27, salaryMax: 31, experienceRequired: 1, employerIndex: 1, status: JobStatus.APPROVED },
    { title: 'City Taxi Operator', driverCategory: DriverCategory.TAXI, description: 'Flexible shifts serving downtown customers.', location: 'Toronto, ON', salaryMin: 24, salaryMax: 29, experienceRequired: 1, employerIndex: 0, status: JobStatus.APPROVED },
    { title: 'School Bus Driver', driverCategory: DriverCategory.BUS, description: 'Split-shift school routes. Training available.', location: 'Brampton, ON', salaryMin: 25, salaryMax: 29, experienceRequired: 0, employerIndex: 0, status: JobStatus.APPROVED },
    { title: 'Personal Chauffeur', driverCategory: DriverCategory.PERSONAL, description: 'Professional chauffeur for scheduled client trips.', location: 'Calgary, AB', salaryMin: 28, salaryMax: 34, experienceRequired: 3, employerIndex: 1, status: JobStatus.APPROVED },
    { title: 'Heavy Equipment Hauler', driverCategory: DriverCategory.HEAVY, description: 'Transport equipment safely between Alberta sites.', location: 'Edmonton, AB', salaryMin: 36, salaryMax: 44, experienceRequired: 4, employerIndex: 0, status: JobStatus.APPROVED },
    { title: 'Company Car Driver', driverCategory: DriverCategory.CAR, description: 'Scheduled document and small parcel transport.', location: 'Ottawa, ON', salaryMin: 23, salaryMax: 27, experienceRequired: 1, employerIndex: 1, status: JobStatus.APPROVED },
    { title: 'Fleet Support Driver', driverCategory: DriverCategory.OTHER, description: 'Move vehicles between regional branches.', location: 'Vancouver, BC', salaryMin: 25, salaryMax: 30, experienceRequired: 2, employerIndex: 0, status: JobStatus.APPROVED },
    { title: 'Weekend Freight Driver', driverCategory: DriverCategory.TRUCK, description: 'Weekend linehaul coverage with consistent routes.', location: 'Hamilton, ON', salaryMin: 34, salaryMax: 39, experienceRequired: 2, employerIndex: 1, status: JobStatus.PENDING },
    { title: 'Evening Courier Driver', driverCategory: DriverCategory.DELIVERY, description: 'Evening parcel routes with a company vehicle.', location: 'Calgary, AB', salaryMin: 26, salaryMax: 30, experienceRequired: 1, employerIndex: 1, status: JobStatus.PENDING },
  ]

  const jobs = await Promise.all(jobInputs.map((input, index) => {
    const id = `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`
    const { employerIndex, ...job } = input
    const data = {
      ...job,
      employerId: employers[employerIndex]!.id,
      requiredDocuments: ['Valid licence', 'Driving abstract'],
      workingHours: 'Full-time · Day shift',
      vacancies: 2,
    }

    return prisma.job.upsert({ where: { id }, update: data, create: { id, ...data } })
  }))

  const applicationInputs = [
    { jobIndex: 0, driverIndex: 0, status: ApplicationStatus.APPLIED, coverNote: 'Six years of safe long-haul experience.' },
    { jobIndex: 1, driverIndex: 1, status: ApplicationStatus.SHORTLISTED, coverNote: 'Experienced GTA delivery driver.' },
    { jobIndex: 3, driverIndex: 2, status: ApplicationStatus.VIEWED, coverNote: 'I enjoy working with school communities.' },
    { jobIndex: 4, driverIndex: 3, status: ApplicationStatus.APPLIED, coverNote: 'Passenger transport and accessibility experience.' },
    { jobIndex: 6, driverIndex: 4, status: ApplicationStatus.APPLIED, coverNote: 'Five years of professional city driving.' },
  ]

  await Promise.all(applicationInputs.map((input) => {
    const job = jobs[input.jobIndex]!
    const driver = drivers[input.driverIndex]!
    return prisma.application.upsert({
      where: { jobId_driverId: { jobId: job.id, driverId: driver.id } },
      update: { status: input.status, coverNote: input.coverNote },
      create: { jobId: job.id, driverId: driver.id, status: input.status, coverNote: input.coverNote },
    })
  }))

  console.info('Seeded Driver Hub demo users, profiles, jobs, and applications.')
}

main()
  .catch((error: unknown) => {
    console.error('Driver Hub seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())