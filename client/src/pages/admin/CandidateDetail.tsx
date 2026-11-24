import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Zap,
  GraduationCap,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Building,
  Check,
  X,
  AlertCircle,
} from 'lucide-react'
import AssignPackageModal from '@/components/admin/AssignPackageModal'
import AdminSubscriptionCard from '@/components/admin/AdminSubscriptionCard'
import { useEducationMaster } from '@/hooks/useEducationMaster'
import toast from 'react-hot-toast'

interface EducationItem {
  id: string
  degree: string
  fieldOfStudy?: string | null
  institution: string
  startYear?: number | null
  endYear?: number | null
  grade?: string | null
  isCurrent?: boolean
}

export default function AdminCandidateDetail() {
  const { id } = useParams<{ id: string }>()
  const [candidate, setCandidate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [assignModalOpen, setAssignModalOpen] = useState(false)

  // Education Master hooks
  const { educationLevels, highestDegrees } = useEducationMaster()

  // Edit Qualification State
  const [isEditingQual, setIsEditingQual] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState('')
  const [selectedDegree, setSelectedDegree] = useState('')
  const [savingQual, setSavingQual] = useState(false)

  // Add Education Modal State
  const [isAddEduOpen, setIsAddEduOpen] = useState(false)
  const [eduDegree, setEduDegree] = useState('')
  const [eduField, setEduField] = useState('')
  const [eduInstitution, setEduInstitution] = useState('')
  const [eduStartYear, setEduStartYear] = useState('')
  const [eduEndYear, setEduEndYear] = useState('')
  const [eduGrade, setEduGrade] = useState('')
  const [savingEdu, setSavingEdu] = useState(false)

  // Delete Education Modal State
  const [deletingEduId, setDeletingEduId] = useState<string | null>(null)
  const [isDeletingEdu, setIsDeletingEdu] = useState(false)

  const fetchCandidate = async () => {
    if (!id) return
    try {
      const res = await adminAPI.getCandidateDetail(id)
      setCandidate(res.data.data)
      setSelectedLevel(res.data.data?.educationLevel || '')
      setSelectedDegree(res.data.data?.highestDegree || '')
    } catch (err) {
      console.error(err)
      toast.error('Failed to load candidate details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCandidate()
  }, [id])

  const handleSaveQualifications = async () => {
    if (!id) return
    setSavingQual(true)
    try {
      await adminAPI.updateCandidateEducationAndDegree(id, {
        educationLevel: selectedLevel || undefined,
        highestDegree: selectedDegree || undefined,
      })
      toast.success('Candidate qualifications updated successfully')
      setIsEditingQual(false)
      fetchCandidate()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update qualifications')
    } finally {
      setSavingQual(false)
    }
  }

  const handleAddEducation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    if (!eduDegree.trim() || !eduInstitution.trim()) {
      toast.error('Degree and Institution are required')
      return
    }

    setSavingEdu(true)
    try {
      await adminAPI.addCandidateEducation(id, {
        degree: eduDegree.trim(),
        fieldOfStudy: eduField.trim() || undefined,
        institution: eduInstitution.trim(),
        startYear: eduStartYear ? parseInt(eduStartYear, 10) : undefined,
        endYear: eduEndYear ? parseInt(eduEndYear, 10) : undefined,
        grade: eduGrade.trim() || undefined,
      })
      toast.success('Education record added successfully')
      setIsAddEduOpen(false)
      setEduDegree('')
      setEduField('')
      setEduInstitution('')
      setEduStartYear('')
      setEduEndYear('')
      setEduGrade('')
      fetchCandidate()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add education record')
    } finally {
      setSavingEdu(false)
    }
  }

  const handleDeleteEducation = async () => {
    if (!id || !deletingEduId) return
    setIsDeletingEdu(true)
    try {
      await adminAPI.deleteCandidateEducation(id, deletingEduId)
      toast.success('Education record deleted')
      setDeletingEduId(null)
      fetchCandidate()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete education record')
    } finally {
      setIsDeletingEdu(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="bg-white rounded-2xl p-8 animate-pulse h-96" />
      </AdminLayout>
    )
  }

  const educationList: EducationItem[] = candidate?.education || []

  return (
    <AdminLayout>
      <SEOMeta title="Candidate Overview (Admin) | Career Wings" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/admin/candidates" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" /> Back to Candidates List
          </Link>

          <button
            type="button"
            onClick={() => setAssignModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            Assign Package
          </button>
        </div>

        {/* Candidate Profile Summary Header */}
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 font-black text-2xl flex items-center justify-center text-slate-700">
              {candidate?.firstName?.[0] || 'C'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {candidate?.firstName} {candidate?.lastName}
              </h1>
              <p className="text-sm text-slate-500">{candidate?.user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 border-t border-slate-100 pt-6 text-sm">
            <div>
              <strong className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Phone</strong>
              <span className="text-slate-700">{candidate?.phone || 'Not provided'}</span>
            </div>
            <div>
              <strong className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Location</strong>
              <span className="text-slate-700">{candidate?.currentLocation || 'Assam, India'}</span>
            </div>
            <div>
              <strong className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Experience</strong>
              <span className="text-slate-700">{candidate?.totalExperience || 0} Years</span>
            </div>
            <div>
              <strong className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</strong>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                candidate?.user?.isActive !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                {candidate?.user?.isActive !== false ? 'Active Account' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Education & Highest Degree Card */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Education & Academic Qualifications</h2>
                <p className="text-xs text-slate-500">Manage candidate education levels, highest degree, and history records</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingQual(!isEditingQual)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                {isEditingQual ? 'Cancel Edit' : 'Edit Qualifications'}
              </button>

              <button
                type="button"
                onClick={() => setIsAddEduOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Education Record
              </button>
            </div>
          </div>

          {/* Quick Edit Qualifications Form */}
          {isEditingQual ? (
            <div className="p-4 bg-slate-50 rounded-2xl border border-blue-100 space-y-4">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Edit Candidate Profile Qualifications
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Standard Education Level / Qualification
                  </label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- Select Education Level --</option>
                    {educationLevels.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Highest Degree Earned
                  </label>
                  <select
                    value={selectedDegree}
                    onChange={(e) => setSelectedDegree(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- Select Highest Degree --</option>
                    {highestDegrees.map((deg) => (
                      <option key={deg} value={deg}>{deg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingQual(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingQual}
                  onClick={handleSaveQualifications}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {savingQual ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Education Level
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {candidate?.educationLevel || 'Not specified'}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                  Profile Level
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Highest Degree
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {candidate?.highestDegree || 'Not specified'}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                  Highest Degree
                </span>
              </div>
            </div>
          )}

          {/* Education Records History List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Education Records ({educationList.length})
              </h3>
            </div>

            {educationList.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">No education records added for this candidate yet.</p>
                <button
                  type="button"
                  onClick={() => setIsAddEduOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add First Record
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {educationList.map((edu) => (
                  <div
                    key={edu.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 transition shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 leading-snug">{edu.degree}</h4>
                            {edu.fieldOfStudy && (
                              <p className="text-xs text-slate-500">{edu.fieldOfStudy}</p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setDeletingEduId(edu.id)}
                          title="Delete this education record"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600 mt-2">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{edu.institution}</span>
                        </div>
                        {(edu.startYear || edu.endYear) && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {edu.startYear || ''} {edu.startYear && edu.endYear ? '–' : ''} {edu.endYear || (edu.isCurrent ? 'Present' : '')}
                            </span>
                          </div>
                        )}
                        {edu.grade && (
                          <div className="text-[11px] font-semibold text-slate-500">
                            Grade / Score: <span className="text-slate-800">{edu.grade}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subscription Plan Overview */}
        {candidate?.user && (
          <AdminSubscriptionCard
            user={candidate.user}
            userType="CANDIDATE"
            onRefresh={() => fetchCandidate()}
            onOpenAssignModal={() => setAssignModalOpen(true)}
          />
        )}

        {/* Assign Package Modal */}
        {candidate && (
          <AssignPackageModal
            isOpen={assignModalOpen}
            onClose={() => setAssignModalOpen(false)}
            onAssigned={() => fetchCandidate()}
            preselectedUser={{
              id: candidate.id,
              email: candidate.user?.email,
              name: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Candidate',
              role: 'CANDIDATE',
            }}
            initialUserType="CANDIDATE"
          />
        )}

        {/* Add Education Modal */}
        {isAddEduOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Add Education Record</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddEduOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddEducation} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Degree / Course <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={eduDegree}
                    onChange={(e) => setEduDegree(e.target.value)}
                    placeholder="e.g. B.Tech Computer Science, MBA, 12th Standard"
                    list="degree-presets"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                  <datalist id="degree-presets">
                    {highestDegrees.map((deg) => (
                      <option key={deg} value={deg} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Field of Study / Specialization
                  </label>
                  <input
                    type="text"
                    value={eduField}
                    onChange={(e) => setEduField(e.target.value)}
                    placeholder="e.g. Information Technology, Finance, Science"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    College / School / University <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={eduInstitution}
                    onChange={(e) => setEduInstitution(e.target.value)}
                    placeholder="e.g. Gauhati University, Cotton College, Assam Engineering College"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Start Year
                    </label>
                    <input
                      type="number"
                      value={eduStartYear}
                      onChange={(e) => setEduStartYear(e.target.value)}
                      placeholder="2018"
                      min={1960}
                      max={2035}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      End Year (or Passing)
                    </label>
                    <input
                      type="number"
                      value={eduEndYear}
                      onChange={(e) => setEduEndYear(e.target.value)}
                      placeholder="2022"
                      min={1960}
                      max={2035}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grade / Percentage / CGPA
                  </label>
                  <input
                    type="text"
                    value={eduGrade}
                    onChange={(e) => setEduGrade(e.target.value)}
                    placeholder="e.g. 8.4 CGPA or 78%"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddEduOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdu}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                  >
                    {savingEdu ? 'Saving...' : 'Add Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Education Confirmation Dialog */}
        {deletingEduId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Education Record?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to delete this education entry? This record will be permanently removed from the candidate's profile.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingEduId(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingEdu}
                  onClick={handleDeleteEducation}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {isDeletingEdu ? 'Deleting...' : 'Delete Record'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
