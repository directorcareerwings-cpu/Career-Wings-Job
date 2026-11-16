import React, { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import CandidateLayout from '@/components/layout/CandidateLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { Lock, Bell, Shield, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CandidateSettings() {
  const { user, logout } = useAuthStore()
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success('Security settings updated')
    setCurrentPassword('')
    setNewPassword('')
  }

  return (
    <CandidateLayout>
      <SEOMeta title="Account Settings | Career Wings" />

      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage your account login credentials, notification preferences, and privacy.
          </p>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-orange-500" /> Change Password
          </h2>

          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <button type="submit" className="btn-primary text-sm">
              Update Password
            </button>
          </form>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-500" /> Notification Preferences
          </h2>

          <div className="flex items-center justify-between py-2">
            <div>
              <strong className="block text-sm font-semibold text-slate-900">Email Job Alerts</strong>
              <span className="text-xs text-slate-500">
                Receive email notifications about matching jobs in Guwahati & Assam.
              </span>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="w-5 h-5 accent-orange-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl border border-red-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-base font-bold text-red-700 mb-1">Sign Out</h2>
          <p className="text-xs text-slate-500 mb-4">
            Sign out of your Career Wings account across this browser.
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
    </CandidateLayout>
  )
}
