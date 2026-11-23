import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { employerAPI } from '@/lib/api'
import EmployerLayout from '@/components/layout/EmployerLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { Save, ArrowLeft, Star, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function EditJob() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [featuredQuota, setFeaturedQuota] = useState<{
    limit: number
    used: number
    remaining: number
    isUnlimited: boolean
    canFeature: boolean
    packageName: string
  } | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    responsibilities: '',
    requirements: '',
    salaryMin: 20000,
    salaryMax: 35000,
    salaryPeriod: 'MONTHLY',
    workMode: 'ON_SITE',
    jobType: 'FULL_TIME',
    locationText: 'Guwahati, Assam',
    vacancies: 1,
    isFeatured: false,
  })

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) return
      try {
        const [res, qRes] = await Promise.all([
          employerAPI.getJobs(),
          employerAPI.getFeaturedQuota().catch(() => null),
        ])
        const found = res.data.data.find((j: any) => j.id === id)
        if (found) {
          setForm({
            title: found.title || '',
            description: found.description || '',
            responsibilities: found.responsibilities || '',
            requirements: found.requirements || '',
            salaryMin: found.salaryMin || 20000,
            salaryMax: found.salaryMax || 35000,
            salaryPeriod: found.salaryPeriod || 'MONTHLY',
            workMode: found.workMode || 'ON_SITE',
            jobType: found.jobType || 'FULL_TIME',
            locationText: found.locationText || 'Guwahati, Assam',
            vacancies: found.vacancies || 1,
            isFeatured: Boolean(found.isFeatured),
          })
        }
        if (qRes?.data?.data) {
          setFeaturedQuota(qRes.data.data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchJob()
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value
    setForm({ ...form, [e.target.name]: val })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    try {
      await employerAPI.updateJob(id, form)
      toast.success('Job vacancy updated successfully!')
      navigate('/employer/jobs')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update job')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <EmployerLayout>
        <div className="bg-white rounded-3xl p-8 border border-slate-100 animate-pulse h-96" />
      </EmployerLayout>
    )
  }

  return (
    <EmployerLayout>
      <SEOMeta title="Edit Job Vacancy | Career Wings" />

      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Job Vacancy</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Modify requirements, salary range, or job specifications.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Job Title
              </label>
              <input
                type="text"
                name="title"
                required
                value={form.title}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Job Type
                </label>
                <select
                  name="jobType"
                  value={form.jobType}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERNSHIP">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Work Mode
                </label>
                <select
                  name="workMode"
                  value={form.workMode}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                >
                  <option value="ON_SITE">On-site</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="REMOTE">Remote</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  name="locationText"
                  required
                  value={form.locationText}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Min Monthly Salary (₹)
                </label>
                <input
                  type="number"
                  name="salaryMin"
                  value={form.salaryMin}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Max Monthly Salary (₹)
                </label>
                <input
                  type="number"
                  name="salaryMax"
                  value={form.salaryMax}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Job Description
              </label>
              <textarea
                name="description"
                required
                rows={5}
                value={form.description}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {/* Featured Job Package Option */}
            <div
              className={cn(
                'p-5 rounded-2xl border transition-all',
                form.isFeatured
                  ? 'bg-amber-500/5 border-amber-300 ring-2 ring-amber-500/20'
                  : 'bg-white border-slate-200/90 hover:border-slate-300'
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                      form.isFeatured
                        ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    <Star className={cn('w-5 h-5', form.isFeatured ? 'fill-white' : '')} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Feature this Job on Homepage & Top of Search
                      </h3>
                      {form.isFeatured && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Featured Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                      Featured jobs appear on the Career Wings homepage and are pinned to the top of candidate searches, generating up to 5x more applications.
                    </p>

                    {/* Quota Status */}
                    <div className="mt-2 text-xs">
                      {featuredQuota ? (
                        featuredQuota.limit <= 0 ? (
                          <div className="flex items-center gap-2 text-slate-500">
                            <span className="text-rose-600 font-semibold">
                              Not included in {featuredQuota.packageName}
                            </span>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => navigate('/employer/subscription')}
                              className="text-amber-600 hover:text-amber-700 font-bold underline cursor-pointer"
                            >
                              Upgrade package to unlock
                            </button>
                          </div>
                        ) : form.isFeatured || featuredQuota.canFeature ? (
                          <span className="text-emerald-700 font-medium">
                            ✓ {featuredQuota.isUnlimited ? 'Unlimited' : `${featuredQuota.remaining} of ${featuredQuota.limit}`} featured slots remaining in your {featuredQuota.packageName} plan
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 text-rose-600 font-medium">
                            <span>All {featuredQuota.limit} featured slots used in your {featuredQuota.packageName} plan</span>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => navigate('/employer/subscription')}
                              className="text-amber-600 hover:text-amber-700 font-bold underline cursor-pointer"
                            >
                              Upgrade Plan
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-slate-400">Checking package limits...</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Toggle switch */}
                <div className="self-start sm:self-center shrink-0">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      disabled={!form.isFeatured && (!featuredQuota || !featuredQuota.canFeature)}
                      onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 peer-disabled:opacity-40 peer-disabled:cursor-not-allowed"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-4">
              <button
                type="submit"
                disabled={saving}
                className="py-3.5 px-8 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Update Job'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </EmployerLayout>
  )
}
