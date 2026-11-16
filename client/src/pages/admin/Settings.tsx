import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { ShieldAlert, Lock, Bell, Check, CreditCard, ArrowRight, ShieldCheck, Zap, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminAPI } from '@/lib/api'

export default function AdminSettings() {
  const { logout } = useAuthStore()
  const [autoApprove, setAutoApprove] = useState(true)
  const [razorpayConfig, setRazorpayConfig] = useState<{
    keyId: string
    mode: string
    isEnabled: boolean
  } | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await adminAPI.getRazorpayConfig()
        setRazorpayConfig(res.data.data)
      } catch (err) {
        console.error('Failed to load razorpay config:', err)
      } finally {
        setLoadingConfig(false)
      }
    }
    fetchConfig()
  }, [])

  return (
    <AdminLayout>
      <SEOMeta title="System Settings (Admin) | Career Wings" />

      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System & Platform Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Configure payment gateways, moderation policies, fraud prevention rules, and administrator sessions.
          </p>
        </div>

        {/* Razorpay Gateway Overview Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Razorpay Payment Gateway
                  {razorpayConfig && (
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        !razorpayConfig.isEnabled
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : razorpayConfig.mode === 'LIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {!razorpayConfig.isEnabled ? 'Disabled' : `${razorpayConfig.mode} Mode`}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage API keys, Webhooks, Test vs Live environment, and test API connectivity.
                </p>
              </div>
            </div>

            <Link
              to="/admin/payments?tab=razorpay"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0"
            >
              <span>Configure Gateway</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
            <div>
              <span className="font-semibold text-slate-700">Active Key ID:</span>{' '}
              <code className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                {loadingConfig ? 'Loading...' : razorpayConfig?.keyId || 'Not Configured'}
              </code>
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Checkout Auto-Sync Enabled</span>
            </div>
          </div>
        </div>

        {/* Email & OTP Notification Subsystem Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Official Email & OTP Subsystem
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                    Active
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure SMTP server credentials, sender address (@careerwings.in), email queue, and audit logs.
                </p>
              </div>
            </div>

            <Link
              to="/admin/emails"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0"
            >
              <span>Manage Mail Engine</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
            <div>
              <span className="font-semibold text-slate-700">Official Sender:</span>{' '}
              <code className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                noreply@careerwings.in
              </code>
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>OTP & Transactional Logging Enabled</span>
            </div>
          </div>
        </div>

        {/* Moderation Settings */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <strong className="block text-sm font-semibold text-slate-900">Auto-Approve Verified Employers' Postings</strong>
              <span className="text-xs text-slate-500">
                Instantly publish job vacancies submitted by verified corporate accounts without manual queuing.
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => {
                setAutoApprove(e.target.checked)
                toast.success('Moderation rule updated')
              }}
              className="w-5 h-5 accent-orange-500 rounded cursor-pointer"
            />
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-red-600 mb-2">Administrator Session</h3>
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition"
            >
              Sign Out of Admin Console
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
