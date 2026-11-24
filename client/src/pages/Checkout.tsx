import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { publicAPI, paymentsAPI } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  ShieldCheck,
  Tag,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Lock,
  CreditCard,
  Zap,
  ExternalLink,
  HelpCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Package } from '@/types'

declare global {
  interface Window {
    Razorpay?: any
  }
}

const loadRazorpaySDK = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false)
      return
    }
    // If Razorpay SDK is already loaded and ready
    if (window.Razorpay) {
      resolve(true)
      return
    }

    let isDone = false
    const finish = (result: boolean) => {
      if (!isDone) {
        isDone = true
        clearInterval(pollInterval)
        clearTimeout(safetyTimer)
        resolve(result)
      }
    }

    // Safety timeout: 4.5 seconds max so checkout button never freezes indefinitely
    const safetyTimer = setTimeout(() => {
      finish(!!window.Razorpay)
    }, 4500)

    // Periodic check every 100ms in case the script tag in index.html is parsing
    const pollInterval = setInterval(() => {
      if (window.Razorpay) {
        finish(true)
      }
    }, 100)

    // Find or inject script
    let script = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    )
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      document.body.appendChild(script)
    }

    script.addEventListener('load', () => {
      setTimeout(() => finish(!!window.Razorpay), 100)
    })
    script.addEventListener('error', () => {
      finish(false)
    })
  })
}

export default function Checkout() {
  const [searchParams] = useSearchParams()
  const packageId = searchParams.get('packageId')
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [pkg, setPkg] = useState<Package | null>(null)
  const [loading, setLoading] = useState(true)
  const [couponCode, setCouponCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState(0)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [gatewayConfig, setGatewayConfig] = useState<{
    keyId: string
    mode: string
    isEnabled: boolean
  } | null>(null)
  const [showSandboxFallback, setShowSandboxFallback] = useState(false)
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      navigate(`/login?redirect=/checkout?packageId=${packageId}`)
      return
    }

    // Pre-load Razorpay SDK script
    loadRazorpaySDK()

    // Fetch package details
    const loadPkg = async () => {
      try {
        const [pkgRes, configRes] = await Promise.all([
          publicAPI.getPackages(),
          paymentsAPI.getConfig().catch(() => null),
        ])

        const found = pkgRes.data.data.find((p: Package) => p.id === packageId)
        if (found) {
          const pkgType = String(found.type).toUpperCase()
          if (user && user.role !== 'ADMIN' && user.role !== pkgType) {
            setPageError(
              user.role === 'CANDIDATE'
                ? 'This package is for Employer accounts only. As a Job Seeker, please select an official Candidate package.'
                : 'This package is for Job Seekers only. As an Employer, please select an Employer recruitment package.'
            )
          } else {
            setPkg(found)
          }
        } else {
          setPageError('Selected package was not found.')
        }

        if (configRes?.data?.data) {
          setGatewayConfig(configRes.data.data)
        }
      } catch (err) {
        console.error(err)
        setPageError('Failed to load package details.')
      } finally {
        setLoading(false)
      }
    }

    loadPkg()
  }, [packageId, user, navigate])

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!couponCode.trim() || !packageId) return

    setValidatingCoupon(true)
    setPaymentError(null)

    try {
      const res = await paymentsAPI.validateCoupon(couponCode, packageId)
      setAppliedDiscount(res.data.data.discountAmount)
      toast.success(`Coupon ${couponCode} applied successfully!`)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired coupon')
      setAppliedDiscount(0)
    } finally {
      setValidatingCoupon(false)
    }
  }

  // Fallback simulator for testing when no real Razorpay key is present
  const handleSimulatePayment = async (orderIdToVerify?: string) => {
    const targetOrderId = orderIdToVerify || pendingOrderId
    if (!targetOrderId) return

    setProcessingPayment(true)
    try {
      toast.loading('Simulating successful test payment...', { id: 'sim-pay' })
      await paymentsAPI.verifyPayment({
        razorpayOrderId: targetOrderId,
        razorpayPaymentId: `pay_sim_${Date.now()}`,
        razorpaySignature: 'dev_mock_signature',
      })
      toast.success('Test payment successful! Subscription activated.', { id: 'sim-pay' })
      navigate(user?.role === 'EMPLOYER' ? '/employer/subscription' : '/subscription')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Simulation failed', { id: 'sim-pay' })
      setProcessingPayment(false)
    }
  }

  const handlePayment = async () => {
    if (!pkg) return
    setProcessingPayment(true)
    setPaymentError(null)
    setShowSandboxFallback(false)

    // Safety watchdog: ensure button is never stuck for more than 12 seconds
    const watchdogTimer = setTimeout(() => {
      setProcessingPayment(false)
    }, 12000)

    try {
      // 1. Create order on backend
      const res = await paymentsAPI.createOrder({
        packageId: pkg.id,
        couponCode: appliedDiscount > 0 ? couponCode : undefined,
      })

      const { orderId, amount, keyId } = res.data.data
      setPendingOrderId(orderId)

      // 2. Free package activation (amount is 0)
      if (amount === 0) {
        clearTimeout(watchdogTimer)
        toast.success('Subscription activated successfully!')
        navigate(user?.role === 'EMPLOYER' ? '/employer/subscription' : '/subscription')
        return
      }

      // 3. Ensure Razorpay SDK is loaded
      const isSdkLoaded = await loadRazorpaySDK()
      if (!isSdkLoaded || typeof window.Razorpay === 'undefined') {
        clearTimeout(watchdogTimer)
        const errorMsg =
          'Could not load Razorpay checkout (often blocked by browser ad-blockers or privacy shields). Please disable ad-blocker for careerwings.in or use the test simulation below.'
        toast.error(errorMsg, { duration: 6000 })
        setPaymentError(errorMsg)
        setShowSandboxFallback(true)
        setProcessingPayment(false)
        return
      }

      const activeKey =
        keyId ||
        gatewayConfig?.keyId ||
        import.meta.env.VITE_RAZORPAY_KEY_ID ||
        'rzp_live_U1yVTntRzK7jfm'

      // 4. Configure Razorpay checkout options
      const options: any = {
        key: activeKey,
        amount,
        currency: 'INR',
        name: 'Career Wings',
        description: `${pkg.name} Plan Subscription`,
        image: 'https://careerwings.in/favicon.png',
        handler: async (response: any) => {
          try {
            setProcessingPayment(true)
            toast.loading('Verifying transaction with Razorpay...', { id: 'verify-toast' })
            await paymentsAPI.verifyPayment({
              razorpayOrderId: response.razorpay_order_id || orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature || 'rzp_sig',
            })
            toast.success('Payment verified! Your subscription is now active.', { id: 'verify-toast' })
            navigate(user?.role === 'EMPLOYER' ? '/employer/subscription' : '/subscription')
          } catch (err: any) {
            toast.error(err.response?.data?.message || 'Verification failed', { id: 'verify-toast' })
          } finally {
            setProcessingPayment(false)
          }
        },
        prefill: {
          name: `${(user?.profile as any)?.firstName || ''} ${(user?.profile as any)?.lastName || ''}`.trim() || user?.email,
          email: user?.email,
          contact: (user?.profile as any)?.phone || '',
        },
        notes: {
          packageId: pkg.id,
          userId: user?.id,
        },
        theme: {
          color: '#EA580C',
        },
        modal: {
          ondismiss: () => {
            setProcessingPayment(false)
            toast('Payment window closed', { icon: 'ℹ️' })
          },
        },
      }

      // Only pass real order_id to Razorpay (starts with 'order_')
      if (orderId && !orderId.startsWith('mock_')) {
        options.order_id = orderId
      }

      try {
        const rzp = new window.Razorpay(options)

        rzp.on('payment.failed', function (response: any) {
          clearTimeout(watchdogTimer)
          setProcessingPayment(false)
          const failMsg = response.error?.description || 'Transaction declined by bank/gateway'
          setPaymentError(`Payment failed: ${failMsg}`)
          toast.error(`Payment failed: ${failMsg}`)
        })

        clearTimeout(watchdogTimer)
        rzp.open()
        // Automatically release button loading state after 1.5s so user is never frozen
        setTimeout(() => {
          setProcessingPayment(false)
        }, 1500)
      } catch (sdkError: any) {
        clearTimeout(watchdogTimer)
        console.warn('Razorpay open failed, showing sandbox fallback:', sdkError)
        setShowSandboxFallback(true)
        setPaymentError('Could not launch payment dialog. Please allow popups or use instant test simulation.')
        setProcessingPayment(false)
      }
    } catch (err: any) {
      clearTimeout(watchdogTimer)
      console.error('Payment initiation error:', err)
      const errorMsg =
        err.response?.data?.message ||
        err?.message ||
        'Payment initiation failed. Please check your connection or contact support.'
      setPaymentError(errorMsg)
      toast.error(errorMsg)
      setShowSandboxFallback(true)
      setProcessingPayment(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-1 max-w-4xl mx-auto w-full p-8 animate-pulse">
          <div className="h-64 bg-white rounded-3xl" />
        </div>
        <Footer />
      </div>
    )
  }

  if (pageError || !pkg) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
          <h2 className="text-xl font-bold text-slate-900 mb-2 max-w-lg">{pageError || 'Package not found'}</h2>
          <div className="flex items-center gap-3 mt-4">
            <Link
              to={user?.role === 'EMPLOYER' ? '/employer/subscription' : '/subscription'}
              className="py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition"
            >
              {user?.role === 'EMPLOYER' ? 'View Employer Packages' : 'View Candidate Packages'}
            </Link>
            <Link to="/" className="py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition">
              Back to Home
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const finalPrice = Math.max(0, pkg.price - appliedDiscount)

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOMeta title="Secure Checkout | Career Wings" />
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-12">
        {/* Title Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Review & Checkout</h1>
            <p className="text-slate-500 text-sm mt-1">
              Complete your subscription to unlock premium platform benefits.
            </p>
          </div>

          {/* Admin Fast-Switch Link */}
          {user?.role === 'ADMIN' && (
            <Link
              to="/admin/payments?tab=razorpay"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition shadow-2xs"
            >
              <span>Admin: Razorpay Settings</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Checkout Area */}
          <div className="md:col-span-2 space-y-6">
            {/* Payment Error Banner if any */}
            {paymentError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 shadow-xs">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <strong className="text-sm font-bold block text-rose-950">Payment Gateway Notice</strong>
                  <p className="leading-relaxed">{paymentError}</p>
                </div>
              </div>
            )}

            {/* Package Details Card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
                Package Details
              </h2>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{pkg.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{pkg.description}</p>
                  <span className="inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-md bg-orange-50 text-orange-700">
                    Validity: {pkg.durationDays} Days
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-900">
                    {pkg.price === 0 ? 'Free' : `₹${pkg.price.toLocaleString('en-IN')}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            {pkg.price > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-orange-600" />
                    Payment Method
                  </h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Razorpay Connected
                  </span>
                </div>

                {/* Razorpay Option Box */}
                <div className="p-4 rounded-xl border-2 border-orange-500 bg-orange-50/20 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-orange-600 bg-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900">
                          Razorpay Payment Gateway
                        </strong>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800 uppercase tracking-wide">
                          Instant
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Pay securely with UPI (GPay, PhonePe, Paytm), Credit & Debit Cards (Visa, Mastercard, RuPay), NetBanking, or Wallets.
                      </p>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-orange-200/40 text-[11px] font-medium text-slate-600">
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">UPI</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Cards</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">NetBanking</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Wallets</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sandbox Notice / Simulation Fallback Banner */}
            {showSandboxFallback && (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-sm font-bold block text-amber-900">
                      Razorpay Sandbox Mode Active
                    </strong>
                    <p className="mt-0.5 text-amber-800 leading-relaxed">
                      Your Razorpay gateway is currently using default test credentials. To use real Razorpay API keys, configure them in the{' '}
                      <Link to="/admin/payments?tab=razorpay" className="underline font-bold text-amber-900 hover:text-orange-700">
                        Admin Razorpay Settings
                      </Link>
                      . Or you can complete this transaction now via instant test simulation.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSimulatePayment()}
                  disabled={processingPayment}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition shadow-xs"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Simulate Successful Test Payment</span>
                </button>
              </div>
            )}

            {/* Coupon Code Section */}
            {pkg.price > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-orange-500" /> Have a discount coupon?
                </h3>
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code (e.g. WINGS20)"
                    className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 uppercase font-mono"
                  />
                  <button
                    type="submit"
                    disabled={validatingCoupon}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                  >
                    {validatingCoupon ? 'Checking...' : 'Apply'}
                  </button>
                </form>
              </div>
            )}

            {/* Security Guarantee */}
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center gap-3 text-xs text-blue-800">
              <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
              <span>
                256-bit encrypted checkout. Official payment gateway verification via Razorpay (Cards, UPI, Netbanking).
              </span>
            </div>
          </div>

          {/* Price Breakdown Sidebar */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm h-fit space-y-4">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
              Order Summary
            </h3>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹{pkg.price.toLocaleString('en-IN')}</span>
              </div>
              {appliedDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Coupon Discount</span>
                  <span>- ₹{appliedDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Taxes (GST 18%)</span>
                <span className="text-xs text-slate-400">Included</span>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-between font-black text-lg text-slate-900">
                <span>Total Due</span>
                <span className="text-orange-600">
                  {finalPrice === 0 ? 'Free' : `₹${finalPrice.toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>

            {/* Pay Button */}
            <button
              type="button"
              disabled={processingPayment}
              onClick={handlePayment}
              className="w-full mt-4 py-3.5 px-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              {processingPayment ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting to Razorpay...</span>
                </div>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  {finalPrice === 0 ? 'Activate Plan Free' : `Pay ₹${finalPrice.toLocaleString('en-IN')} with Razorpay`}
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Secured by Razorpay Payments</span>
              </span>
            </div>

            <p className="text-xs text-slate-400 text-center leading-relaxed">
              Instant activation. Tax invoice will be issued upon successful transaction.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
