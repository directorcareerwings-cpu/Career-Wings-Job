import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { Search, Eye, ShieldAlert, ShieldCheck, Zap, Clock, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { Candidate } from '@/types'
import AssignPackageModal from '@/components/admin/AssignPackageModal'
import { Pagination } from '@/components/ui/Pagination'

export default function AdminCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedCandidateForPackage, setSelectedCandidateForPackage] = useState<any>(null)

  const fetchCandidates = async (p = page) => {
    setLoading(true)
    try {
      const res = await adminAPI.getCandidates({ q: query, page: p, limit: 15 })
      setCandidates(res.data.data || [])
      if (res.data?.pagination) {
        setTotal(res.data.pagination.total)
        setTotalPages(res.data.pagination.totalPages)
        setPage(res.data.pagination.page)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchCandidates(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    fetchCandidates(newPage)
  }

  const handleToggleStatus = async (id: string) => {
    try {
      await adminAPI.updateCandidateStatus(id, {})
      toast.success('Candidate status updated')
      fetchCandidates(page)
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <AdminLayout>
      <SEOMeta title="Candidate Directory (Admin) | Career Wings" />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Candidate Directory</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Manage registered job seekers, view credentials, and handle account suspensions.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              to="/admin/smart-import"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-white" />
              AI Smart Import
            </Link>

            <button
              type="button"
              onClick={() => {
                setSelectedCandidateForPackage(null)
                setAssignModalOpen(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition whitespace-nowrap"
            >
              <Zap className="w-4 h-4 fill-white" />
              Assign Package
            </button>

            <div className="w-full sm:w-72 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by candidate name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 animate-pulse h-64" />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Candidate</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold">Active Package</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((c: any) => {
                  const activeSub = c.user?.subscriptions?.[0]
                  return (
                    <tr key={c.id}>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {c.firstName} {c.lastName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{c.user?.email || '—'}</td>
                      <td className="py-3.5 px-4 text-slate-500">{c.currentLocation || 'Assam'}</td>
                      <td className="py-3.5 px-4">
                        {activeSub ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900">
                                {activeSub.package?.name || 'Active Package'}
                              </span>
                              {activeSub.package?.badge && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200">
                                  {activeSub.package.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>
                                Expires {new Date(activeSub.endDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Job Seeker Free</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            c.user?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {c.user?.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCandidateForPackage({
                                id: c.id,
                                email: c.user?.email,
                                name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Candidate',
                                role: 'CANDIDATE',
                              })
                              setAssignModalOpen(true)
                            }}
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                            title="Assign Package Manually"
                          >
                            <Zap className="w-4 h-4 fill-orange-500" />
                          </button>
                          <Link
                            to={`/admin/candidates/${c.id}`}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(c.id)}
                            className={`p-1.5 rounded-lg text-xs font-semibold ${
                              c.user?.isActive
                                ? 'text-red-500 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={c.user?.isActive ? 'Suspend' : 'Activate'}
                          >
                            {c.user?.isActive ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {total > 0 && totalPages > 1 && (
              <div className="p-4 border-t border-slate-100">
                <Pagination
                  page={page}
                  pages={totalPages}
                  total={total}
                  limit={15}
                  itemLabel="candidates"
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        )}

        <AssignPackageModal
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false)
            setSelectedCandidateForPackage(null)
          }}
          preselectedUser={selectedCandidateForPackage}
          initialUserType="CANDIDATE"
          onAssigned={() => fetchCandidates()}
        />
      </div>
    </AdminLayout>
  )
}
