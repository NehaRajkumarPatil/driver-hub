import axios from 'axios'

export const AUTH_TOKEN_KEY = 'driver-hub-access-token'
const AUTH_EXPIRED_EVENT = 'driver-hub:auth-expired'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 20000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
    }
    return Promise.reject(error)
  },
)

export const getApiErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message ?? 'The server could not complete the request.'
  }
  return 'Something went wrong. Please try again.'
}

export type UserRole = 'DRIVER' | 'EMPLOYER' | 'ADMIN'

export type AuthUser = {
  id: string
  name: string
  email: string
  phone: string | null
  role: UserRole
  status: 'ACTIVE' | 'BLOCKED'
  driverProfile?: DriverProfile | null
  employerProfile?: EmployerProfile | null
}

export type DriverProfile = {
  userId: string
  location: string | null
  dob: string | null
  bio: string | null
  licenseType: string | null
  licenseNumber: string | null
  licenseExpiry: string | null
  totalExperienceYears: number
  skills: string[]
  preferredCategories: string[]
  expectedSalary: number | string | null
  availability: string | null
  isProfilePublic: boolean
  experiences?: DriverExperience[]
  user?: Pick<AuthUser, 'id' | 'name' | 'email' | 'phone'>
}

export type DriverExperience = {
  id: string
  driverId: string
  vehicleType: string
  employerName: string
  years: number
  notes: string | null
}

export type ApiJob = {
  id: string
  title: string
  driverCategory: string
  description: string
  location: string
  salaryMin: number | string | null
  salaryMax: number | string | null
  experienceRequired: number
  workingHours: string | null
  requiredDocuments: string[]
  vacancies: number
  status: string
  createdAt: string
  employer: { companyName: string; industry?: string | null; location?: string | null; verified?: boolean }
}

export type ApiApplication = {
  id: string
  jobId: string
  driverId: string
  status: 'APPLIED' | 'VIEWED' | 'SHORTLISTED' | 'REJECTED' | 'HIRED'
  coverNote: string | null
  createdAt: string
  job: ApiJob
}

export type ApiSavedJob = { driverId: string; jobId: string; createdAt: string; job: ApiJob }

export type ApiDocument = {
  id: string
  type: 'RESUME' | 'LICENSE' | 'ID_PROOF' | 'OTHER'
  fileUrl: string
  fileName: string
  uploadedAt: string
}

export type ApiNotification = {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

export type EmployerProfile = {
  userId: string
  companyName: string
  industry: string | null
  description: string | null
  location: string | null
  website: string | null
  logoUrl: string | null
  verified: boolean
}

export const authExpiredEventName = AUTH_EXPIRED_EVENT