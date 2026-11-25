import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '@/lib/api'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { Mail, Lock, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const navigate = useNavigate()

  const [step, setStep] = useState<'EMAIL' | 'RESET'>('EMAIL')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let timer: any
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((p) => p - 1), 1000)
    }
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError(null)

    try {
      await authAPI.forgotPassword(email)
      setStep('RESET')
      setResendCooldown(60)
      toast.success('If an account exists, a 6-digit reset code has been sent.')
    } catch {
      // Security: never reveal account existence
      setStep('RESET')
      setResendCooldown(60)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit code received on your email.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter (A-Z).')
      return
    }

    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one numeric digit (0-9).')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setResetting(true)

    try {
      await authAPI.resetPasswordWithOtp({
        email: email.trim(),
        otp: otp.trim(),
        password,
      })

      toast.success('Password changed successfully! Please log in.')
      navigate('/login')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to reset password. Please verify the code.'
      setError(msg)
      toast.error(msg)
    } finally {
      setResetting(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return

    setResending(true)
    setError(null)

    try {
      await authAPI.forgotPassword(email)
      setResendCooldown(60)
      toast.success('A fresh password reset code has been dispatched!')
    } catch {
      setResendCooldown(60)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOMeta title="Reset Password | Career Wings" noindex />
      <Header />

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          {step === 'EMAIL' ? (
            /* Step 1: Enter Email */
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-100 shadow-xs">
                  <Lock className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Forgot Password?</h1>
                <p className="text-sm text-slate-500 mt-1.5">
                  Enter your registered email address and we'll send you a 6-digit verification code to reset your password.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{loading ? 'Sending Code...' : 'Send Reset Code'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <Link
                  to="/login"
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Return to Login
                </Link>
              </div>
            </>
          ) : (
            /* Step 2: Enter OTP and New Password */
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-xs">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Set New Password</h1>
                <p className="text-sm text-slate-500 mt-1.5">
                  Enter the 6-digit code sent to <strong className="text-slate-900">{email}</strong> and choose your new password.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-center">
                    6-Digit Reset Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.6em] font-mono text-xl py-2.5 px-4 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-orange-500 text-slate-900 font-bold bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetting || otp.length !== 6 || !password}
                  className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{resetting ? 'Updating Password...' : 'Reset Password & Proceed'}</span>
                </button>
              </form>

              <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => {
                    setStep('EMAIL')
                    setError(null)
                  }}
                  className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Email</span>
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || resending}
                  className={`font-semibold flex items-center gap-1 cursor-pointer ${
                    resendCooldown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-orange-600 hover:text-orange-700'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
