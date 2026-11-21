import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Search,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
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

  // Selection & bulk delete state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [candidateToDelete, setCandidateToDelete] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  // Selection handlers
  const candidateIdsOnPage = candidates
    .map((c) => c.id || c._id)
    .filter((id): id is string => Boolean(id))

  const isAllOnPageSelected =
    candidateIdsOnPage.length > 0 &&
    candidateIdsOnPage.every((id) => selectedIds.includes(id))

  const isSomeOnPageSelected = candidateIdsOnPage.some((id) =>
    selectedIds.includes(id)
  )

  const toggleSelectAllOnPage = () => {
    if (isAllOnPageSelected) {
      // Deselect all on current page
      const pageIdSet = new Set(candidateIdsOnPage)
      setSelectedIds((prev) => prev.filter((id) => !pageIdSet.has(id)))
    } else {
      // Select all on current page
      setSelectedIds((prev) => Array.from(new Set([...prev, ...candidateIdsOnPage])))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const clearSelection = () => {
    setSelectedIds([])
  }

  // Delete modal triggers
  const openDeleteSingle = (c: any) => {
    setCandidateToDelete(c)
    setDeleteModalOpen(true)
  }

  const openBulkDelete = () => {
    setCandidateToDelete(null)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      if (candidateToDelete) {
        await adminAPI.deleteCandidate(candidateToDelete.id)
        toast.success('Candidate profile deleted successfully')
        setSelectedIds((prev) => prev.filter((id) => id !== candidateToDelete.id))
      } else if (selectedIds.length > 0) {
        await adminAPI.bulkDeleteCandidates(selectedIds)
        toast.success(`${selectedIds.length} candidate(s) deleted successfully`)
        setSelectedIds([])
      }
      setDeleteModalOpen(false)
      setCandidateToDelete(null)

      // Check if page needs to decrement
      const countDeleted = candidateToDelete ? 1 : selectedIds.length
      const remainingOnPage = candidates.length - countDeleted
      if (remainingOnPage <= 0 && page > 1) {
        handlePageChange(page - 1)
      } else {
        fetchCandidates(page)
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'Failed to delete candidate(s)'
      toast.error(msg)
    } finally {
      setIsDeleting(false)
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

        {/* ─── BULK SELECTION ACTION BAR ──────────────────────────────── */}
        {selectedIds.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm transition-all animate-fadeIn">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-orange-600 text-white text-xs font-bold">
                {selectedIds.length}
              </span>
              <div>
                <span className="text-sm font-semibold text-slate-900">
                  {selectedIds.length} candidate{selectedIds.length > 1 ? 's' : ''} selected
                </span>
                <span className="text-xs text-slate-500 ml-2 hidden sm:inline">
                  (Actions will apply to all selected profiles)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearSelection}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-xs"
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={openBulkDelete}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm hover:shadow transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Bulk Delete ({selectedIds.length})
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 animate-pulse h-64" />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllOnPageSelected}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = !isAllOnPageSelected && isSomeOnPageSelected
                        }
                      }}
                      onChange={toggleSelectAllOnPage}
                      className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500 cursor-pointer"
                      title="Select all on this page"
                    />
                  </th>
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
                  const isSelected = selectedIds.includes(c.id)

                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-orange-50/50 hover:bg-orange-50/80' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(c.id)}
                          className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500 cursor-pointer"
                          aria-label={`Select candidate ${c.firstName} ${c.lastName}`}
                        />
                      </td>
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
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={c.user?.isActive ? 'Suspend' : 'Activate'}
                          >
                            {c.user?.isActive ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteSingle(c)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                            title="Delete Candidate Profile"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* ─── DELETE CONFIRMATION MODAL ──────────────────────────────── */}
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900">
                  {candidateToDelete
                    ? 'Delete Candidate Profile?'
                    : `Delete ${selectedIds.length} Candidate${selectedIds.length > 1 ? 's' : ''}?`}
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  {candidateToDelete ? (
                    <>
                      Are you sure you want to permanently delete{' '}
                      <strong className="text-slate-800">
                        {candidateToDelete.firstName} {candidateToDelete.lastName}
                      </strong>{' '}
                      ({candidateToDelete.user?.email || 'No email'})?
                    </>
                  ) : (
                    <>
                      Are you sure you want to permanently delete{' '}
                      <strong className="text-slate-800">
                        {selectedIds.length} selected candidate profile{selectedIds.length > 1 ? 's' : ''}
                      </strong>
                      ?
                    </>
                  )}
                </p>

                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 text-left">
                  <p className="font-semibold mb-1">Permanent Action Warning:</p>
                  This action will permanently remove the candidate profile, user credentials,
                  resume files, job applications, and all associated history. This action cannot be undone.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    setDeleteModalOpen(false)
                    setCandidateToDelete(null)
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {candidateToDelete
                    ? 'Yes, Delete Candidate'
                    : `Yes, Delete ${selectedIds.length} Candidates`}
                </button>
              </div>
            </div>
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
