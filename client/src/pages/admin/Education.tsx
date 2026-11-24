import React, { useState, useEffect } from 'react'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  GraduationCap,
  Award,
  Plus,
  Trash2,
  Search,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminEducation() {
  const [activeTab, setActiveTab] = useState<'levels' | 'degrees'>('levels')
  const [educationLevels, setEducationLevels] = useState<string[]>([])
  const [highestDegrees, setHighestDegrees] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modals
  const [levelModalOpen, setLevelModalOpen] = useState(false)
  const [newLevelName, setNewLevelName] = useState('')
  const [isSubmittingLevel, setIsSubmittingLevel] = useState(false)

  const [degreeModalOpen, setDegreeModalOpen] = useState(false)
  const [newDegreeName, setNewDegreeName] = useState('')
  const [isSubmittingDegree, setIsSubmittingDegree] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'level' | 'degree'
    name: string
  } | null>(null)

  const fetchMasterData = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getEducationMaster()
      const data = res.data.data || {}
      setEducationLevels(data.educationLevels || [])
      setHighestDegrees(data.highestDegrees || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load education master data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMasterData()
  }, [])

  const handleAddLevel = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newLevelName.trim()
    if (!name) {
      toast.error('Please enter an educational qualification name')
      return
    }

    try {
      setIsSubmittingLevel(true)
      await adminAPI.createEducationLevel({ name })
      toast.success(`"${name}" added successfully!`)
      setNewLevelName('')
      setLevelModalOpen(false)
      fetchMasterData()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add qualification')
    } finally {
      setIsSubmittingLevel(false)
    }
  }

  const handleDeleteLevel = async (name: string) => {
    try {
      await adminAPI.deleteEducationLevel(name)
      toast.success(`"${name}" deleted successfully`)
      setDeleteConfirm(null)
      fetchMasterData()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete qualification')
    }
  }

  const handleAddDegree = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newDegreeName.trim()
    if (!name) {
      toast.error('Please enter a degree title or abbreviation')
      return
    }

    try {
      setIsSubmittingDegree(true)
      await adminAPI.createHighestDegree({ name })
      toast.success(`"${name}" added successfully!`)
      setNewDegreeName('')
      setDegreeModalOpen(false)
      fetchMasterData()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add degree')
    } finally {
      setIsSubmittingDegree(false)
    }
  }

  const handleDeleteDegree = async (name: string) => {
    try {
      await adminAPI.deleteHighestDegree(name)
      toast.success(`"${name}" deleted successfully`)
      setDeleteConfirm(null)
      fetchMasterData()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete degree')
    }
  }

  const filteredLevels = educationLevels.filter((lvl) =>
    lvl.toLowerCase().includes(search.toLowerCase())
  )

  const filteredDegrees = highestDegrees.filter((deg) =>
    deg.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <SEOMeta title="Education & Degrees Master (Admin) | Career Wings" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <GraduationCap className="w-7 h-7 text-blue-600" />
              Education & Highest Degrees
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Insert, manage, and delete educational qualifications and degree options available across Candidate Profiles and Job Vacancy forms.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'levels' ? (
              <button
                type="button"
                onClick={() => setLevelModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition"
              >
                <Plus className="w-4 h-4" /> Add Qualification
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setDegreeModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition"
              >
                <Plus className="w-4 h-4" /> Add Degree
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => setActiveTab('levels')}
            className={`p-5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
              activeTab === 'levels'
                ? 'bg-blue-50/70 border-blue-200 shadow-sm'
                : 'bg-white border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  activeTab === 'levels'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Qualifications (Levels)
                </span>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">
                  {educationLevels.length}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-100/60 px-3 py-1 rounded-full">
              {activeTab === 'levels' ? 'Active Tab' : 'View Levels'}
            </span>
          </div>

          <div
            onClick={() => setActiveTab('degrees')}
            className={`p-5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
              activeTab === 'degrees'
                ? 'bg-indigo-50/70 border-indigo-200 shadow-sm'
                : 'bg-white border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  activeTab === 'degrees'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Highest Degree Titles
                </span>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">
                  {highestDegrees.length}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-100/60 px-3 py-1 rounded-full">
              {activeTab === 'degrees' ? 'Active Tab' : 'View Degrees'}
            </span>
          </div>
        </div>

        {/* Search & Tabs Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Navigation Pill Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('levels')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'levels'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Educational Qualifications ({educationLevels.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('degrees')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'degrees'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Highest Degrees ({highestDegrees.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTab === 'levels' ? 'qualifications' : 'degrees'}...`}
              className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Content Table / Cards */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-200 animate-pulse text-center text-slate-400 text-sm">
            Loading directory data...
          </div>
        ) : activeTab === 'levels' ? (
          /* TAB 1: Educational Qualifications */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Educational Qualification Name
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {filteredLevels.length} Item{filteredLevels.length === 1 ? '' : 's'}
              </span>
            </div>

            {filteredLevels.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">
                No educational qualifications match your search.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredLevels.map((lvl, idx) => (
                  <div
                    key={lvl}
                    className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{lvl}</h4>
                        <span className="text-[11px] text-slate-400">
                          Available in Candidate Profile & Job Forms
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirm({ type: 'level', name: lvl })}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                      title="Delete Qualification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: Highest Degrees */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Configured Degree Titles</h3>
                <p className="text-xs text-slate-500">
                  Click the trash icon to remove any degree from candidate profiles and job posting options.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {filteredDegrees.length} Degree{filteredDegrees.length === 1 ? '' : 's'}
              </span>
            </div>

            {filteredDegrees.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">
                No degrees match your search.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredDegrees.map((deg) => (
                  <div
                    key={deg}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-indigo-300 transition shadow-xs flex items-center justify-between gap-2 group"
                  >
                    <span className="font-bold text-slate-800 text-xs truncate" title={deg}>
                      {deg}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm({ type: 'degree', name: deg })}
                      className="text-slate-300 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition"
                      title={`Delete ${deg}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Add Educational Level */}
      {levelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Educational Qualification</h3>
                <p className="text-xs text-slate-500">Insert a new qualification level into system dropdowns.</p>
              </div>
            </div>

            <form onSubmit={handleAddLevel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Qualification Title / Level
                </label>
                <input
                  type="text"
                  value={newLevelName}
                  onChange={(e) => setNewLevelName(e.target.value)}
                  placeholder="e.g. Post Doctorate / Senior Diploma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setLevelModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLevel}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {isSubmittingLevel ? 'Saving...' : 'Add Qualification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Highest Degree */}
      {degreeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Highest Degree Title</h3>
                <p className="text-xs text-slate-500">Insert a new degree or certification acronym.</p>
              </div>
            </div>

            <form onSubmit={handleAddDegree} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Degree Name / Abbreviation
                </label>
                <input
                  type="text"
                  value={newDegreeName}
                  onChange={(e) => setNewDegreeName(e.target.value)}
                  placeholder="e.g. B.Arch, M.Des, D.Pharm, BDS..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDegreeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDegree}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {isSubmittingDegree ? 'Saving...' : 'Add Degree'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Confirm Delete</h3>
            </div>

            <p className="text-sm text-slate-600 mb-5">
              Are you sure you want to delete{' '}
              <strong className="text-slate-900">"{deleteConfirm.name}"</strong>? It will no longer appear in form selection menus.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  deleteConfirm.type === 'level'
                    ? handleDeleteLevel(deleteConfirm.name)
                    : handleDeleteDegree(deleteConfirm.name)
                }
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
