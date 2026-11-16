import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { authAPI } from '@/lib/api'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { User, Building2, Mail, Lock, Phone, ArrowRight, AlertCircle, ShieldCheck, RefreshCw, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Register() {
  const navigate = useNavigate()
  const { setUser, setAccessToken } = useAuthStore()

  const [step, setStep] = useState<'FORM' | 'OTP'>('FORM')
  const [role, setRole] = useState<'CANDIDATE' | 'EMPLOYER'>('CANDIDATE')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    companyName: '',
    designation: '',
  })
  const [otp, setOtp] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resend OTP countdown timer
  useEffect(() => {
    let timer: any
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await authAPI.register({
        ...formData,
        role,
      })

      // Backend now sends OTP and requires verification
      if (res.data?.data?.requiresVerification) {
        setStep('OTP')
        setResendCooldown(60)
        toast.success('Verification code sent to your email!')
      } else {
        // Fallback in case verification is skipped
        const { user, accessToken } = res.data.data
        setUser(user)
        setAccessToken(accessToken)
        toast.success('Account created successfully! Welcome to Career Wings.')
        navigate(user.role === 'EMPLOYER' ? '/employer/dashboard' : '/dashboard')
      }
    } catch (err: any) {
      const errList = err.response?.data?.errors
      if (Array.isArray(errList) && errList.length > 0) {
        const detail = errList.map((e: any) => e.message).join('. ')
        setError(detail)
        toast.error(detail)
      } else {
        const message = err.response?.data?.message || 'Registration failed. Please check your details.'
        setError(message)
        toast.error(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp || otp.trim().length !== 6) {
      setError('Please enter a valid 6-digit verification code.')
      return
    }

    setError(null)
    setVerifying(true)

    try {
      const res = await authAPI.verifyOtp({
        email: formData.email,
        otp: otp.trim(),
      })

      const { user, accessToken } = res.data.data
      setUser(user)
      setAccessToken(accessToken)
      toast.success('Account verified successfully! Welcome to Career Wings.')

      if (user.role === 'EMPLOYER') {
        navigate('/employer/dashboard')
      } else {
        navigate('/dashboard')
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Invalid or expired OTP. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setVerifying(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return

    setResending(true)
    setError(null)

    try {
      await authAPI.resendOtp({
        email: formData.email,
        type: 'REGISTRATION',
      })
      setResendCooldown(60)
      toast.success('A new 6-digit verification code has been dispatched!')
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to resend verification code. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOMeta
        title="Create Career Wings Account | Candidate or Recruiter"
        description="Register free on Career Wings to access verified jobs or post job vacancies in Guwahati, Assam and across Northeast India."
      />
      <Header />

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          {step === 'OTP' ? (
            /* OTP Verification Screen */
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-orange-100">
                <Mail className="w-8 h-8" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Verify Your Email</h1>
                <p className="text-sm text-slate-500 mt-2">
                  We've sent a 6-digit verification code to <strong className="text-slate-900">{formData.email}</strong>.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5 text-left">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-5 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                    Enter 6-Digit Verification Code
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
                    className="w-full text-center tracking-[0.7em] font-mono text-2xl py-3.5 px-4 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 text-slate-900 font-bold bg-slate-50/50"
                  />
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    Valid for 10 minutes &bull; One-time verification
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={verifying || otp.length !== 6}
                  className="w-full py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{verifying ? 'Verifying Code...' : 'Verify & Complete Registration'}</span>
                </button>
              </form>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => {
                    setStep('FORM')
                    setError(null)
                  }}
                  className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || resending}
                  className={`font-semibold flex items-center gap-1.5 cursor-pointer ${
                    resendCooldown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-orange-600 hover:text-orange-700'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>{resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create your Career Wings account</h1>
                <p className="text-sm text-slate-500 mt-2">
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold text-orange-600 hover:text-orange-700">
                    Log in
                  </Link>
                </p>
              </div>

              {/* Role Switcher */}
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setRole('CANDIDATE')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                    role === 'CANDIDATE'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <User className="w-4 h-4" />
                  I'm a Job Seeker
                </button>
                <button
                  type="button"
                  onClick={() => setRole('EMPLOYER')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                    role === 'EMPLOYER'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  I'm an Employer
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Rahul"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Barman"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {role === 'EMPLOYER' ? 'Work Email Address' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder={role === 'EMPLOYER' ? 'recruiter@company.com' : 'rahul@example.com'}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900 text-sm"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">We'll send a 6-digit OTP to verify this email.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900 text-sm"
                    />
                  </div>
                </div>

                {role === 'EMPLOYER' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Company Name
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          type="text"
                          name="companyName"
                          required
                          value={formData.companyName}
                          onChange={handleChange}
                          placeholder="Kamakhya Tech Pvt Ltd"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Your Designation
                      </label>
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleChange}
                        placeholder="HR Manager / Talent Lead"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900 text-sm"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="password"
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min. 8 chars, 1 uppercase, 1 number"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900 text-sm"
                    />
                  </div>
                </div>

                <div className="text-xs text-slate-500 pt-1 leading-relaxed">
                  By signing up, you agree to our{' '}
                  <Link to="/terms-of-service" className="text-orange-600 hover:underline font-medium">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy-policy" className="text-orange-600 hover:underline font-medium">
                    Privacy Policy
                  </Link>
                  .
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{loading ? 'Sending Verification Code...' : 'Create Account & Verify Email'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
