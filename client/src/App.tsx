import React, { useEffect, Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import { LoadingSpinner } from '@/components/ui/Spinner'
import MobileNav from '@/components/layout/MobileNav'

// ─── Lazy-loaded pages ──────────────────────────────────────────────────────

// Public
const Home = lazy(() => import('@/pages/public/Home'))
const Jobs = lazy(() => import('@/pages/public/Jobs'))
const JobDetail = lazy(() => import('@/pages/public/JobDetail'))
const Companies = lazy(() => import('@/pages/public/Companies'))
const CompanyDetail = lazy(() => import('@/pages/public/CompanyDetail'))
const Categories = lazy(() => import('@/pages/public/Categories'))
const CategoryJobs = lazy(() => import('@/pages/public/CategoryJobs'))
const Locations = lazy(() => import('@/pages/public/Locations'))
const LocationJobs = lazy(() => import('@/pages/public/LocationJobs'))
const About = lazy(() => import('@/pages/public/About'))
const Contact = lazy(() => import('@/pages/public/Contact'))
const Pricing = lazy(() => import('@/pages/public/Pricing'))
const Login = lazy(() => import('@/pages/public/Login'))
const Register = lazy(() => import('@/pages/public/Register'))
const ForgotPassword = lazy(() => import('@/pages/public/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/public/ResetPassword'))
const PrivacyPolicy = lazy(() => import('@/pages/public/PrivacyPolicy'))
const TermsOfService = lazy(() => import('@/pages/public/TermsOfService'))
const RefundPolicy = lazy(() => import('@/pages/public/RefundPolicy'))
const Blog = lazy(() => import('@/pages/public/Blog'))
const BlogDetail = lazy(() => import('@/pages/public/BlogDetail'))
const AdminBlog = lazy(() => import('@/pages/admin/Blog'))

// Candidate
const CandidateDashboard = lazy(() => import('@/pages/candidate/Dashboard'))
const CandidateProfile = lazy(() => import('@/pages/candidate/Profile'))
const CandidateResume = lazy(() => import('@/pages/candidate/Resume'))
const CandidateApplications = lazy(() => import('@/pages/candidate/Applications'))
const SavedJobs = lazy(() => import('@/pages/candidate/SavedJobs'))
const JobAlerts = lazy(() => import('@/pages/candidate/JobAlerts'))
const Notifications = lazy(() => import('@/pages/candidate/Notifications'))
const CandidateSubscription = lazy(() => import('@/pages/candidate/Subscription'))
const CandidatePayments = lazy(() => import('@/pages/candidate/Payments'))
const CandidateSettings = lazy(() => import('@/pages/candidate/Settings'))
const CandidateNetworkingChat = lazy(() => import('@/pages/candidate/NetworkingChat'))
const CandidateCareerTools = lazy(() => import('@/pages/candidate/CareerTools'))

// Employer
const EmployerDashboard = lazy(() => import('@/pages/employer/Dashboard'))
const CompanyProfile = lazy(() => import('@/pages/employer/CompanyProfile'))
const PostJob = lazy(() => import('@/pages/employer/PostJob'))
const ManageJobs = lazy(() => import('@/pages/employer/ManageJobs'))
const EditJob = lazy(() => import('@/pages/employer/EditJob'))
const Applicants = lazy(() => import('@/pages/employer/Applicants'))
const ATSApplicants = lazy(() => import('@/pages/employer/ATSApplicants'))
const CandidateDatabase = lazy(() => import('@/pages/employer/CandidateDatabase'))
const CandidateDetailEmployer = lazy(() => import('@/pages/employer/CandidateDetail'))
const SavedCandidates = lazy(() => import('@/pages/employer/SavedCandidates'))
const Analytics = lazy(() => import('@/pages/employer/Analytics'))
const EmployerSubscription = lazy(() => import('@/pages/employer/Subscription'))
const EmployerPayments = lazy(() => import('@/pages/employer/Payments'))
const EmployerSettings = lazy(() => import('@/pages/employer/Settings'))
const NetworkingChat = lazy(() => import('@/pages/employer/NetworkingChat'))

// Admin
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'))
const AdminCandidates = lazy(() => import('@/pages/admin/Candidates'))
const AdminCandidateDetail = lazy(() => import('@/pages/admin/CandidateDetail'))
const AdminEmployers = lazy(() => import('@/pages/admin/Employers'))
const AdminEmployerDetail = lazy(() => import('@/pages/admin/EmployerDetail'))
const AdminCompanies = lazy(() => import('@/pages/admin/Companies'))
const AdminJobs = lazy(() => import('@/pages/admin/Jobs'))
const AdminJobDetail = lazy(() => import('@/pages/admin/JobDetail'))
const AdminApplications = lazy(() => import('@/pages/admin/Applications'))
const AdminPackages = lazy(() => import('@/pages/admin/Packages'))
const AdminPayments = lazy(() => import('@/pages/admin/Payments'))
const AdminCoupons = lazy(() => import('@/pages/admin/Coupons'))
const AdminCategories = lazy(() => import('@/pages/admin/Categories'))
const AdminLocations = lazy(() => import('@/pages/admin/Locations'))
const AdminSkills = lazy(() => import('@/pages/admin/Skills'))
const AdminNotifications = lazy(() => import('@/pages/admin/NotificationsAdmin'))
const AdminReports = lazy(() => import('@/pages/admin/Reports'))
const AdminCMS = lazy(() => import('@/pages/admin/CMS'))
const AdminSettings = lazy(() => import('@/pages/admin/Settings'))
const AdminCoolPlaces = lazy(() => import('@/pages/admin/CoolPlaces'))
const AdminSEO = lazy(() => import('@/pages/admin/SEO/AdminSEO'))
const AdminEmails = lazy(() => import('@/pages/admin/EmailManagement'))
const AdminSmartImport = lazy(() => import('@/pages/admin/SmartImport'))

// Checkout
const Checkout = lazy(() => import('@/pages/Checkout'))

// ─── 404 ────────────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <div className="text-8xl font-bold text-primary-900 mb-4">404</div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Page Not Found</h1>
      <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
      <a href="/" className="btn-primary">Go Home</a>
    </div>
  )
}

// ─── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:slug" element={<JobDetail />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/companies/:slug" element={<CompanyDetail />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/categories/:slug" element={<CategoryJobs />} />
        <Route path="/locations" element={<Locations />} />
        <Route path="/locations/:slug" element={<LocationJobs />} />
        {/* Clean SEO Landing URLs */}
        <Route path="/jobs-in-:slug" element={<LocationJobs />} />
        <Route path="/jobs/category/:slug" element={<CategoryJobs />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/terms" element={<Navigate to="/terms-of-service" replace />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogDetail />} />
        <Route path="/checkout" element={<Checkout />} />

        {/* Candidate Public / Shared Profile */}
        <Route path="/candidate/:id" element={<CandidateDetailEmployer />} />

        {/* Candidate */}
        <Route path="/dashboard" element={<ProtectedRoute role="candidate"><CandidateDashboard /></ProtectedRoute>} />
        <Route path="/candidate/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/candidate" element={<Navigate to="/dashboard" replace />} />
        <Route path="/profile" element={<ProtectedRoute role="candidate"><CandidateProfile /></ProtectedRoute>} />
        <Route path="/profile/resume" element={<ProtectedRoute role="candidate"><CandidateResume /></ProtectedRoute>} />
        <Route path="/my-applications" element={<ProtectedRoute role="candidate"><CandidateApplications /></ProtectedRoute>} />
        <Route path="/saved-jobs" element={<ProtectedRoute role="candidate"><SavedJobs /></ProtectedRoute>} />
        <Route path="/job-alerts" element={<ProtectedRoute role="candidate"><JobAlerts /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute role="candidate"><Notifications /></ProtectedRoute>} />
        <Route path="/subscription" element={<ProtectedRoute role="candidate"><CandidateSubscription /></ProtectedRoute>} />
        <Route path="/my-package" element={<ProtectedRoute role="candidate"><CandidateSubscription /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute role="candidate"><CandidatePayments /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute role="candidate"><CandidateSettings /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute role="candidate"><CandidateNetworkingChat /></ProtectedRoute>} />
        <Route path="/candidate/chat" element={<ProtectedRoute role="candidate"><CandidateNetworkingChat /></ProtectedRoute>} />
        <Route path="/career-tools" element={<ProtectedRoute role="candidate"><CandidateCareerTools /></ProtectedRoute>} />

        {/* Employer */}
        <Route path="/employer" element={<Navigate to="/employer/candidates" replace />} />
        <Route path="/employer/dashboard" element={<ProtectedRoute role="employer"><EmployerDashboard /></ProtectedRoute>} />
        <Route path="/employer/company" element={<ProtectedRoute role="employer"><CompanyProfile /></ProtectedRoute>} />
        <Route path="/employer/jobs/post" element={<ProtectedRoute role="employer"><PostJob /></ProtectedRoute>} />
        <Route path="/employer/jobs" element={<ProtectedRoute role="employer"><ManageJobs /></ProtectedRoute>} />
        <Route path="/employer/jobs/:id/edit" element={<ProtectedRoute role="employer"><EditJob /></ProtectedRoute>} />
        <Route path="/employer/jobs/:id/applicants" element={<ProtectedRoute role="employer"><Applicants /></ProtectedRoute>} />
        <Route path="/employer/ats" element={<ProtectedRoute role="employer"><ATSApplicants /></ProtectedRoute>} />
        <Route path="/employer/candidates" element={<ProtectedRoute role="employer"><CandidateDatabase /></ProtectedRoute>} />
        <Route path="/employer/candidates/:id" element={<ProtectedRoute role="employer"><CandidateDetailEmployer /></ProtectedRoute>} />
        <Route path="/employer/saved-candidates" element={<ProtectedRoute role="employer"><SavedCandidates /></ProtectedRoute>} />
        <Route path="/employer/analytics" element={<ProtectedRoute role="employer"><Analytics /></ProtectedRoute>} />
        <Route path="/employer/subscription" element={<ProtectedRoute role="employer"><EmployerSubscription /></ProtectedRoute>} />
        <Route path="/employer/my-package" element={<ProtectedRoute role="employer"><EmployerSubscription /></ProtectedRoute>} />
        <Route path="/employer/payments" element={<ProtectedRoute role="employer"><EmployerPayments /></ProtectedRoute>} />
        <Route path="/employer/chat" element={<ProtectedRoute role="employer"><NetworkingChat /></ProtectedRoute>} />
        <Route path="/employer/settings" element={<ProtectedRoute role="employer"><EmployerSettings /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/smart-import" element={<ProtectedRoute role="admin"><AdminSmartImport /></ProtectedRoute>} />
        <Route path="/admin/candidates" element={<ProtectedRoute role="admin"><AdminCandidates /></ProtectedRoute>} />
        <Route path="/admin/candidates/:id" element={<ProtectedRoute role="admin"><AdminCandidateDetail /></ProtectedRoute>} />
        <Route path="/admin/employers" element={<ProtectedRoute role="admin"><AdminEmployers /></ProtectedRoute>} />
        <Route path="/admin/employers/:id" element={<ProtectedRoute role="admin"><AdminEmployerDetail /></ProtectedRoute>} />
        <Route path="/admin/companies" element={<ProtectedRoute role="admin"><AdminCompanies /></ProtectedRoute>} />
        <Route path="/admin/jobs" element={<ProtectedRoute role="admin"><AdminJobs /></ProtectedRoute>} />
        <Route path="/admin/jobs/:id" element={<ProtectedRoute role="admin"><AdminJobDetail /></ProtectedRoute>} />
        <Route path="/admin/applications" element={<ProtectedRoute role="admin"><AdminApplications /></ProtectedRoute>} />
        <Route path="/admin/packages" element={<ProtectedRoute role="admin"><AdminPackages /></ProtectedRoute>} />
        <Route path="/admin/packages/new" element={<ProtectedRoute role="admin"><AdminPackages /></ProtectedRoute>} />
        <Route path="/admin/packages/:id/edit" element={<ProtectedRoute role="admin"><AdminPackages /></ProtectedRoute>} />
        <Route path="/admin/payments" element={<ProtectedRoute role="admin"><AdminPayments /></ProtectedRoute>} />
        <Route path="/admin/coupons" element={<ProtectedRoute role="admin"><AdminCoupons /></ProtectedRoute>} />
        <Route path="/admin/categories" element={<ProtectedRoute role="admin"><AdminCategories /></ProtectedRoute>} />
        <Route path="/admin/locations" element={<ProtectedRoute role="admin"><AdminLocations /></ProtectedRoute>} />
        <Route path="/admin/skills" element={<ProtectedRoute role="admin"><AdminSkills /></ProtectedRoute>} />
        <Route path="/admin/notifications" element={<ProtectedRoute role="admin"><AdminNotifications /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute role="admin"><AdminReports /></ProtectedRoute>} />
        <Route path="/admin/blog" element={<ProtectedRoute role="admin"><AdminBlog /></ProtectedRoute>} />
        <Route path="/admin/cms" element={<ProtectedRoute role="admin"><AdminCMS /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>} />
        <Route path="/admin/emails" element={<ProtectedRoute role="admin"><AdminEmails /></ProtectedRoute>} />
        <Route path="/admin/cool-places" element={<ProtectedRoute role="admin"><AdminCoolPlaces /></ProtectedRoute>} />
        <Route path="/admin/seo" element={<ProtectedRoute role="admin"><AdminSEO /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <MobileNav />
    </Suspense>
  )
}
