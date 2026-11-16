import React, { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import EmployerLayout from '@/components/layout/EmployerLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { Lock, Bell, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EmployerSettings() {
  const { logout } = useAuthStore()
  const [applicantAlerts, setApplicantAlerts] = useState(true)

  return (
    <EmployerLayout>
      <SEOMeta title="Recruiter Settings | Career Wings" />

      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recruiter Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Configure application alert notifications and security preferences.
          </p>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-500" /> Applicant Email Alerts
          </h2>

          <div className="flex items-center justify-between py-2">
            <div>
              <strong className="block text-sm font-semibold text-slate-900">Instant Application Alerts</strong>
              <span className="text-xs text-slate-500">
                Receive email alerts as soon as a candidate submits an application.
              </span>
            </div>
            <input
              type="checkbox"
              checked={applicantAlerts}
              onChange={(e) => {
                setApplicantAlerts(e.target.checked)
                toast.success('Notification preferences updated')
              }}
              className="w-5 h-5 accent-orange-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Sign Out */}
        <div className="bg-white rounded-2xl border border-red-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-base font-bold text-red-700 mb-1">Sign Out</h2>
          <p className="text-xs text-slate-500 mb-4">
            End your current session across this browser.
          </p>
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition"
          >
            Log Out
          </button>
        </div>
      </div>
    </EmployerLayout>
  )
}
