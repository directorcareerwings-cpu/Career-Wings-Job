import React, { useState, useEffect } from 'react'
import { candidateAPI } from '@/lib/api'
import CandidateLayout from '@/components/layout/CandidateLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { FileText, Upload, Download, Trash2, Sparkles, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import AIResumeBuilder from '@/components/resume/AIResumeBuilder'
import { UpgradeBanner } from '@/components/common/UpgradePromptModal'
import { cn } from '@/lib/utils'

export default function CandidateResume() {
  const [activeTab, setActiveTab] = useState<'builder' | 'upload'>('builder')
  const [resumeData, setResumeData] = useState<any>(null)
  const [sub, setSub] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const fetchProfile = async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        candidateAPI.getProfile(),
        candidateAPI.getSubscription().catch(() => ({ data: { data: null } })),
      ])
      setResumeData(pRes.data.data)
      setSub(sRes.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!validTypes.includes(file.type)) {
      toast.error('Only PDF, DOC, or DOCX formats are supported.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size cannot exceed 5 MB.')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('resume', file)

    try {
      await candidateAPI.uploadResume(formData)
      toast.success('Resume uploaded successfully!')
      fetchProfile()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload resume')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteResume = async () => {
    if (!window.confirm('Are you sure you want to remove your uploaded resume?')) return

    try {
      await candidateAPI.deleteResume()
      toast.success('Resume removed')
      fetchProfile()
    } catch {
      toast.error('Failed to delete resume')
    }
  }

  return (
    <CandidateLayout>
      <SEOMeta title="AI Resume Builder & CV Manager | Career Wings" />

      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-fit border border-slate-300/60">
          <button
            type="button"
            onClick={() => setActiveTab('builder')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer',
              activeTab === 'builder'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>AI Resume Builder</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-orange-100 text-orange-800">
              NEW
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer',
              activeTab === 'upload'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload Custom Resume</span>
          </button>
        </div>

        {/* Tab 1: AI Resume Builder */}
        {activeTab === 'builder' && (
          sub?.limits?.resumeBuilder === false ? (
            <div className="space-y-6">
              <UpgradeBanner
                title="Pro AI Resume Builder"
                description="The interactive step-by-step AI Resume Builder is a premium feature. Upgrade your candidate package to unlock AI summary generation, ATS audits, and formatted exports."
                role="CANDIDATE"
              />
              <div className="opacity-40 pointer-events-none filter blur-[1px]">
                <AIResumeBuilder />
              </div>
            </div>
          ) : (
            <AIResumeBuilder />
          )
        )}

        {/* Tab 2: Upload Custom Resume */}
        {activeTab === 'upload' && (
          <div className="max-w-3xl space-y-6 animate-in fade-in">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Upload Custom Resume</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Attach an existing PDF or DOCX file to use across all your job applications.
              </p>
            </div>

            {/* Upload Card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
              <div className="border-2 border-dashed border-slate-200 hover:border-orange-500/40 rounded-2xl p-8 text-center transition bg-slate-50/50">
                <div className="w-14 h-14 bg-orange-100 rounded-2xl text-orange-600 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-7 h-7" />
                </div>

                <h3 className="font-bold text-slate-900 text-base mb-1">
                  Upload Your Latest Resume
                </h3>
                <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
                  Supported formats: PDF, DOC, DOCX. Maximum file size: 5 MB.
                </p>

                <label className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-md transition cursor-pointer">
                  <span>{uploading ? 'Uploading...' : 'Browse Computer'}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    disabled={uploading}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Current Resume Info */}
              {resumeData?.resumeFile && (
                <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">
                        {resumeData.resumeFileName || 'CareerWings_Resume.pdf'}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Updated {resumeData.resumeUpdatedAt ? new Date(resumeData.resumeUpdatedAt).toLocaleDateString() : 'Recently'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/candidate/resume/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition"
                      title="Download"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                    <button
                      type="button"
                      onClick={handleDeleteResume}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </CandidateLayout>
  )
}
