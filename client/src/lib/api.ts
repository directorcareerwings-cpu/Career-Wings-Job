import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth.store'

export const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === '127.0.0.1') {
      return 'http://127.0.0.1:5000/api'
    }
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:5000/api'
    }
    // In production on Hostinger / custom domains, use relative /api
    return '/api'
  }
  return '/api'
}

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true, // for httpOnly refresh token cookie
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor: attach access token & handle multipart ───────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// ─── Response interceptor: handle 401, refresh token ─────────────────────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error)
    else p.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    const requestUrl = originalRequest?.url || ''
    const isAuthEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/forgot-password') ||
      requestUrl.includes('/auth/reset-password')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(
          `${getBaseURL()}/auth/refresh-token`,
          {},
          { withCredentials: true }
        )
        const newToken: string = data.data?.accessToken
        if (newToken) {
          useAuthStore.getState().setAccessToken(newToken)
          if (data.data?.user) {
            useAuthStore.getState().setUser(data.data.user)
          }
        }
        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        useAuthStore.getState().logout()
        const isAuthPage =
          typeof window !== 'undefined' &&
          (window.location.pathname === '/login' || window.location.pathname === '/register')
        if (!isAuthPage && typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: Record<string, unknown>) =>
    api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
  verifyOtp: (data: { email: string; otp: string }) =>
    api.post('/auth/verify-otp', data),
  resendOtp: (data: { email: string; type?: string }) =>
    api.post('/auth/resend-otp', data),
  verifyResetOtp: (data: { email: string; otp: string }) =>
    api.post('/auth/verify-reset-otp', data),
  resetPasswordWithOtp: (data: { email: string; otp: string; password: string }) =>
    api.post('/auth/reset-password-otp', data),
  me: () => api.get('/auth/me'),
  refreshToken: () => api.post('/auth/refresh-token'),
}

// ─── Jobs API ─────────────────────────────────────────────────────────────────
export const jobsAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/jobs', { params }),
  getBySlug: (slug: string) => api.get(`/jobs/${slug}`),
  getFeatured: () => api.get('/jobs/featured'),
  getSimilar: (slug: string) => api.get(`/jobs/${slug}/similar`),
  apply: (jobId: string, data: FormData | Record<string, unknown>) =>
    api.post(`/jobs/${jobId}/apply`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    }),
  save: (jobId: string) => api.post(`/jobs/${jobId}/save`),
  unsave: (jobId: string) => api.delete(`/jobs/${jobId}/save`),
}

// ─── Companies API ────────────────────────────────────────────────────────────
export const companiesAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/companies', { params }),
  getBySlug: (slug: string) => api.get(`/companies/${slug}`),
  getJobs: (slug: string, params?: Record<string, unknown>) =>
    api.get(`/companies/${slug}/jobs`, { params }),
}

// ─── Categories API ────────────────────────────────────────────────────────────
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getBySlug: (slug: string) => api.get(`/categories/${slug}`),
}

// ─── Locations API ────────────────────────────────────────────────────────────
export const locationsAPI = {
  getAll: () => api.get('/locations'),
  getBySlug: (slug: string) => api.get(`/locations/${slug}`),
}

// ─── Candidate API ────────────────────────────────────────────────────────────
export const candidateAPI = {
  getProfile: () => api.get('/candidate/profile'),
  updateProfile: (data: Record<string, unknown>) =>
    api.put('/candidate/profile', data),
  updateAvatar: (formData: FormData) =>
    api.put('/candidate/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadPhoto: (formData: FormData) =>
    api.post('/candidate/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadResume: (formData: FormData) =>
    api.post('/candidate/resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteResume: () => api.delete('/candidate/resume'),
  getApplications: (params?: Record<string, unknown>) =>
    api.get('/candidate/applications', { params }),
  getSavedJobs: () => api.get('/candidate/saved-jobs'),
  getAlerts: () => api.get('/candidate/alerts'),
  createAlert: (data: Record<string, unknown>) =>
    api.post('/candidate/alerts', data),
  updateAlert: (id: string, data: Record<string, unknown>) =>
    api.put(`/candidate/alerts/${id}`, data),
  deleteAlert: (id: string) => api.delete(`/candidate/alerts/${id}`),
  getSubscription: () => api.get('/candidate/subscription'),
  getPayments: () => api.get('/candidate/payments'),
  getNotifications: (params?: Record<string, unknown>) =>
    api.get('/candidate/notifications', { params }),
  markNotificationRead: (id: string) => api.put(`/candidate/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put('/candidate/notifications/read-all'),
  getDashboard: () => api.get('/candidate/dashboard'),
}

// ─── AI Resume API ────────────────────────────────────────────────────────────
export const aiResumeAPI = {
  generateSummary: (data: { targetRole?: string; experienceYears?: number; keySkills?: string[]; tone?: string }) =>
    api.post('/candidate/ai-resume/generate-summary', data),
  enhanceExperience: (data: { jobTitle?: string; company?: string; rawInput?: string }) =>
    api.post('/candidate/ai-resume/enhance-experience', data),
  suggestSkills: (data: { targetRole?: string }) =>
    api.post('/candidate/ai-resume/suggest-skills', data),
  auditATS: (data: { resume: any }) =>
    api.post('/candidate/ai-resume/ats-audit', data),
  getDraft: () =>
    api.get('/candidate/ai-resume/draft'),
  saveDraft: (data: { resume: any; syncProfile?: boolean }) =>
    api.put('/candidate/ai-resume/draft', data),
}

// ─── Employer API ─────────────────────────────────────────────────────────────
export const employerAPI = {
  getDashboard: () => api.get('/employer/dashboard'),
  getCompany: () => api.get('/employer/company'),
  updateCompany: (data: FormData | Record<string, unknown>) =>
    api.put('/employer/company', data, {
      headers:
        data instanceof FormData
          ? { 'Content-Type': 'multipart/form-data' }
          : {},
    }),
  uploadCompanyLogo: (formData: FormData) =>
    api.post('/employer/company/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getJobs: (params?: Record<string, unknown>) =>
    api.get('/employer/jobs', { params }),
  getJob: (id: string) => api.get(`/employer/jobs/${id}`),
  createJob: (data: Record<string, unknown>) => api.post('/employer/jobs', data),
  updateJob: (id: string, data: Record<string, unknown>) =>
    api.put(`/employer/jobs/${id}`, data),
  toggleJobFeatured: (id: string, isFeatured?: boolean) =>
    api.patch(`/employer/jobs/${id}/feature`, isFeatured !== undefined ? { isFeatured } : {}),
  getFeaturedQuota: () => api.get('/employer/jobs/featured-quota'),
  deleteJob: (id: string) => api.delete(`/employer/jobs/${id}`),
  getAllApplicants: (params?: Record<string, unknown>) =>
    api.get('/employer/all-applicants', { params }),
  getApplicants: (jobId: string, params?: Record<string, unknown>) =>
    api.get(`/employer/jobs/${jobId}/applicants`, { params }),
  updateApplicationStatus: (
    jobId: string,
    applicationId: string,
    data: Record<string, unknown>
  ) =>
    api.put(
      `/employer/jobs/${jobId}/applicants/${applicationId}/status`,
      data
    ),
  searchCandidates: (params?: Record<string, unknown>) =>
    api.get('/employer/candidates', { params }),
  bulkDownloadCandidates: (candidateIds: string[]) =>
    api.post('/employer/candidates/bulk-download', { candidateIds }),
  getCandidateDetail: (id: string) =>
    api.get(`/employer/candidates/${id}`),
  saveCandidate: (id: string) => api.post(`/employer/candidates/${id}/save`),
  unsaveCandidate: (id: string) =>
    api.delete(`/employer/candidates/${id}/save`),
  getSavedCandidates: () => api.get('/employer/saved-candidates'),
  getAnalytics: (params?: Record<string, unknown>) =>
    api.get('/employer/analytics', { params }),
  getEmployerCounts: () => api.get('/employer/counts'),
  getSubscription: () => api.get('/employer/subscription'),
  getPayments: () => api.get('/employer/payments'),
  downloadResume: (candidateId: string) =>
    api.get(`/employer/candidates/${candidateId}/resume`, {
      responseType: 'blob',
    }),
  revealCandidateContact: (candidateId: string) =>
    api.post(`/employer/candidates/${candidateId}/reveal`),
  sendCandidateInterviewOffer: (candidateId: string, data: Record<string, unknown>) =>
    api.post(`/employer/candidates/${candidateId}/interview-offer`, data),
}

// ─── Chat API ─────────────────────────────────────────────────────────────────
export const chatAPI = {
  getConversations: () => api.get('/chat/conversations'),
  getMessages: (conversationId: string) => api.get(`/chat/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, message: string) =>
    api.post(`/chat/conversations/${conversationId}/messages`, { message }),
  startConversation: (data: { candidateId: string; jobId?: string; initialMessage?: string }) =>
    api.post('/chat/start', data),
  markAsRead: (conversationId: string) => api.patch(`/chat/conversations/${conversationId}/read`),
  getAvailableCandidates: () => api.get('/chat/candidates'),
}

// ─── Admin API ────────────────────────────────────────────────────────────────
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  // Candidates
  getCandidates: (params?: Record<string, unknown>) =>
    api.get('/admin/candidates', { params }),
  getCandidateDetail: (id: string) => api.get(`/admin/candidates/${id}`),
  updateCandidateStatus: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/candidates/${id}/status`, data),
  deleteCandidate: (id: string) => api.delete(`/admin/candidates/${id}`),
  bulkDeleteCandidates: (candidateIds: string[]) =>
    api.post('/admin/candidates/bulk-delete', { candidateIds }),
  // Employers
  getEmployers: (params?: Record<string, unknown>) =>
    api.get('/admin/employers', { params }),
  getEmployerDetail: (id: string) => api.get(`/admin/employers/${id}`),
  createEmployer: (data: Record<string, unknown>) =>
    api.post('/admin/employers', data),
  updateEmployer: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/employers/${id}`, data),
  deleteEmployer: (id: string) =>
    api.delete(`/admin/employers/${id}`),
  verifyEmployer: (id: string, data?: { isVerified?: boolean }) =>
    api.put(`/admin/employers/${id}/verify`, data),
  updateEmployerStatus: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/employers/${id}/status`, data),
  // Jobs
  getJobs: (params?: Record<string, unknown>) =>
    api.get('/admin/jobs', { params }),
  getJob: (id: string) =>
    api.get(`/admin/jobs/${id}`),
  approveJob: (id: string) => api.put(`/admin/jobs/${id}/approve`),
  rejectJob: (id: string, reason?: string) =>
    api.put(`/admin/jobs/${id}/reject`, { reason }),
  featureJob: (id: string, featured: boolean) =>
    api.put(`/admin/jobs/${id}/feature`, { isFeatured: featured }),
  deleteJob: (id: string) => api.delete(`/admin/jobs/${id}`),
  // Companies
  getCompanies: (params?: Record<string, unknown>) =>
    api.get('/admin/companies', { params }),
  getCompany: (id: string) =>
    api.get(`/admin/companies/${id}`),
  createCompany: (data: Record<string, unknown>) =>
    api.post('/admin/companies', data),
  updateCompany: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/companies/${id}`, data),
  verifyCompany: (id: string) => api.put(`/admin/companies/${id}/verify`),
  featureCompany: (id: string) => api.put(`/admin/companies/${id}/feature`),
  deleteCompany: (id: string) => api.delete(`/admin/companies/${id}`),
  uploadCompanyLogo: (formData: FormData) =>
    api.post('/admin/companies/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  // Packages
  getPackages: (params?: Record<string, unknown>) =>
    api.get('/admin/packages', { params }),
  createPackage: (data: Record<string, unknown>) =>
    api.post('/admin/packages', data),
  updatePackage: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/packages/${id}`, data),
  duplicatePackage: (id: string) =>
    api.post(`/admin/packages/${id}/duplicate`),
  togglePackageActive: (id: string) =>
    api.patch(`/admin/packages/${id}/toggle-active`),
  deletePackage: (id: string) => api.delete(`/admin/packages/${id}`),
  assignPackage: (data: {
    userId?: string
    employerId?: string
    candidateId?: string
    packageId: string
    durationDays?: number
    notes?: string
  }) => api.post('/admin/packages/assign', data),
  extendSubscription: (id: string, daysToAdd: number) =>
    api.post(`/admin/subscriptions/${id}/extend`, { daysToAdd }),
  updateSubscriptionStatus: (id: string, status: string) =>
    api.patch(`/admin/subscriptions/${id}/status`, { status }),
  getUserPackageHistory: (userId: string) =>
    api.get(`/admin/users/${userId}/package-history`),
  // Payments
  getPayments: (params?: Record<string, unknown>) =>
    api.get('/admin/payments', { params }),
  getPaymentStats: () => api.get('/admin/payments/stats'),
  getRazorpayConfig: () => api.get('/admin/payments/razorpay'),
  updateRazorpayConfig: (data: {
    keyId?: string
    keySecret?: string
    webhookSecret?: string
    mode?: 'TEST' | 'LIVE'
    isEnabled?: boolean
    autoCapture?: boolean
  }) => api.put('/admin/payments/razorpay', data),
  testRazorpayConnection: (data?: { keyId?: string; keySecret?: string }) =>
    api.post('/admin/payments/razorpay/test', data || {}),
  // Coupons
  getCoupons: (params?: Record<string, unknown>) =>
    api.get('/admin/coupons', { params }),
  createCoupon: (data: Record<string, unknown>) =>
    api.post('/admin/coupons', data),
  updateCoupon: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id: string) => api.delete(`/admin/coupons/${id}`),
  // Categories
  getCategories: () => api.get('/admin/categories'),
  createCategory: (data: Record<string, unknown>) =>
    api.post('/admin/categories', data),
  updateCategory: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/admin/categories/${id}`),
  // Locations
  getLocations: () => api.get('/admin/locations'),
  createLocation: (data: Record<string, unknown>) =>
    api.post('/admin/locations', data),
  updateLocation: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/locations/${id}`, data),
  deleteLocation: (id: string) => api.delete(`/admin/locations/${id}`),
  // Skills
  getSkills: (params?: Record<string, unknown>) =>
    api.get('/admin/skills', { params }),
  createSkill: (data: Record<string, unknown>) =>
    api.post('/admin/skills', data),
  updateSkill: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/skills/${id}`, data),
  deleteSkill: (id: string) => api.delete(`/admin/skills/${id}`),
  // Education & Degree Master
  getEducationMaster: () => api.get('/admin/education-master'),
  createEducationLevel: (data: { name: string }) => api.post('/admin/education-levels', data),
  deleteEducationLevel: (name: string) => api.delete(`/admin/education-levels/${encodeURIComponent(name)}`),
  createHighestDegree: (data: { name: string }) => api.post('/admin/highest-degrees', data),
  deleteHighestDegree: (name: string) => api.delete(`/admin/highest-degrees/${encodeURIComponent(name)}`),
  // Candidate Education Records (Admin)
  addCandidateEducation: (candidateId: string, data: Record<string, unknown>) =>
    api.post(`/admin/candidates/${candidateId}/education`, data),
  deleteCandidateEducation: (candidateId: string, educationId: string) =>
    api.delete(`/admin/candidates/${candidateId}/education/${educationId}`),
  updateCandidateEducationAndDegree: (candidateId: string, data: { educationLevel?: string; highestDegree?: string }) =>
    api.put(`/admin/candidates/${candidateId}/education-degree`, data),
  // Notifications
  sendNotification: (data: Record<string, unknown>) =>
    api.post('/admin/notifications', data),
  // CMS
  getCMSSettings: () => api.get('/admin/cms'),
  updateCMSSettings: (data: Record<string, unknown>) =>
    api.put('/admin/cms', data),
  // Reports
  getReports: (params?: Record<string, unknown>) =>
    api.get('/admin/reports', { params }),
  // Applications
  getApplications: (params?: Record<string, unknown>) =>
    api.get('/admin/applications', { params }),
  // Cool Places to Work
  getCoolPlaces: () => api.get('/admin/cool-places'),
  createCoolPlace: (data: Record<string, unknown>) => api.post('/admin/cool-places', data),
  updateCoolPlace: (id: string, data: Record<string, unknown>) => api.put(`/admin/cool-places/${id}`, data),
  deleteCoolPlace: (id: string) => api.delete(`/admin/cool-places/${id}`),
  uploadCoolPlaceLogo: (formData: FormData) =>
    api.post('/admin/cool-places/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadHeroImage: (formData: FormData) =>
    api.post('/admin/cms/hero-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadLogo: (formData: FormData) =>
    api.post('/admin/cms/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  // Email Subsystem & SMTP Settings
  getEmailConfig: () => api.get('/admin/emails/config'),
  updateEmailConfig: (data: Record<string, unknown>) =>
    api.put('/admin/emails/config', data),
  sendTestEmail: (data: { toEmail: string }) =>
    api.post('/admin/emails/test', data),
  getEmailLogs: (params?: Record<string, unknown>) =>
    api.get('/admin/emails/logs', { params }),
  retryEmail: (id: string) => api.post(`/admin/emails/logs/${id}/retry`),
  getEmailStats: () => api.get('/admin/emails/stats'),
  getEmailTemplates: () => api.get('/admin/emails/templates'),
  // AI Smart Candidate Database Import
  getTargetFields: () => api.get('/admin/smart-import/target-fields'),
  downloadImportTemplate: () =>
    api.get('/admin/smart-import/download-template', { responseType: 'blob' }),
  uploadImportFile: (formData: FormData) =>
    api.post('/admin/smart-import/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  parseImportSheet: (data: { tempFileId: string; sheetName: string }) =>
    api.post('/admin/smart-import/parse-sheet', data),
  executeImport: (data: {
    tempFileId: string;
    sheetName?: string;
    mappings: Record<string, string>;
    duplicateStrategy: 'SKIP' | 'UPDATE' | 'IMPORT_NEW';
  }) => api.post('/admin/smart-import/execute', data),
  getImportJobProgress: (id: string) =>
    api.get(`/admin/smart-import/job/${id}`),
  getImportHistory: (params?: { page?: number; limit?: number }) =>
    api.get('/admin/smart-import/history', { params }),
  downloadImportReport: (id: string) =>
    api.get(`/admin/smart-import/report/${id}`, { responseType: 'blob' }),
  downloadOriginalImportFile: (id: string) =>
    api.get(`/admin/smart-import/original/${id}`, { responseType: 'blob' }),
}

// ─── Packages / Public API ───────────────────────────────────────────────────
export const publicAPI = {
  getPackages: (type?: string) =>
    api.get('/packages', { params: type ? { type } : {} }),
  getStats: () => api.get('/stats'),
  getFeaturedJobs: () => api.get('/jobs/featured'),
  getTopCompanies: () => api.get('/companies/top'),
  getCoolPlaces: () => api.get('/cool-places'),
  getSettings: () => api.get('/settings'),
  getEducationMaster: () => api.get('/education-master'),
}

// ─── Payments API ─────────────────────────────────────────────────────────────
export const paymentsAPI = {
  getConfig: () => api.get('/payments/config'),
  createOrder: (data: Record<string, unknown>) =>
    api.post('/payments/create-order', data),
  verifyPayment: (data: Record<string, unknown>) =>
    api.post('/payments/verify', data),
  validateCoupon: (code: string, packageId: string) =>
    api.post('/payments/validate-coupon', { code, packageId }),
}

// ─── SEO & Google Indexing API ────────────────────────────────────────────────
export const seoAPI = {
  getDashboard: () => api.get('/admin/seo/dashboard'),
  getPages: (params?: Record<string, unknown>) => api.get('/admin/seo/pages', { params }),
  getPageById: (id: string) => api.get(`/admin/seo/pages/${id}`),
  updatePage: (id: string, data: Record<string, unknown>) => api.put(`/admin/seo/pages/${id}`, data),
  bulkUpdatePages: (data: { pageIds: string[]; action: string }) => api.post('/admin/seo/pages/bulk', data),
  syncPages: () => api.post('/admin/seo/pages/sync'),
  getRobots: () => api.get('/admin/seo/robots'),
  updateRobots: (data: { content: string; allowDangerousOverride?: boolean }) =>
    api.put('/admin/seo/robots', data),
  getQueue: (params?: Record<string, unknown>) => api.get('/admin/seo/queue', { params }),
  enqueueUrls: (urls: string[]) => api.post('/admin/seo/queue/submit', { urls }),
  processQueue: () => api.post('/admin/seo/queue/process'),
  retryQueueItem: (id: string) => api.post(`/admin/seo/queue/${id}/retry`),
  getGscConfig: () => api.get('/admin/seo/gsc'),
  updateGscConfig: (data: Record<string, unknown>) => api.put('/admin/seo/gsc', data),
  inspectUrl: (url: string) => api.get('/admin/seo/gsc/inspect', { params: { url } }),
  getSettings: () => api.get('/admin/seo/settings'),
  updateSettings: (data: Record<string, unknown>) => api.put('/admin/seo/settings', data),
  getJobSchemas: (params?: Record<string, unknown>) => api.get('/admin/seo/schema/jobs', { params }),
  regenerateJobSchema: (id: string) => api.post(`/admin/seo/schema/jobs/${id}/regenerate`),
  validateSchema: (schema: Record<string, unknown>) => api.post('/admin/seo/schema/validate', { schema }),
}

// ─── Blog & Editorial API ────────────────────────────────────────────────────
export const blogAPI = {
  getPosts: (params?: Record<string, unknown>) => api.get('/blog', { params }),
  getPostBySlug: (slug: string) => api.get(`/blog/${slug}`),
  getCategories: () => api.get('/blog/categories'),
  getFeatured: () => api.get('/blog/featured'),
  adminGetPosts: (params?: Record<string, unknown>) => api.get('/admin/blog', { params }),
  adminCreatePost: (data: Record<string, unknown>) => api.post('/admin/blog', data),
  adminUpdatePost: (id: string, data: Record<string, unknown>) => api.put(`/admin/blog/${id}`, data),
  adminDeletePost: (id: string) => api.delete(`/admin/blog/${id}`),
  adminUploadBlogImage: (file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post('/admin/blog/upload-cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}


