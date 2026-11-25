import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { adminAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import {
  UploadCloud,
  FileSpreadsheet,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Download,
  RefreshCw,
  Search,
  Users,
  Database,
  Layers,
  HelpCircle,
  FileText,
  Clock,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react'

interface ColumnMapping {
  field: string
  label: string
  description: string
  required?: boolean
  synonyms: string[]
}

interface ImportJobSummary {
  id: string
  fileName: string
  status: string
  totalRows: number
  processedRows: number
  successCount: number
  updatedCount: number
  skippedCount: number
  invalidCount: number
  failedCount: number
  duplicateStrategy: string
  createdAt: string
  reportPath?: string
}

export default function SmartImport() {
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import')
  const [targetFields, setTargetFields] = useState<ColumnMapping[]>([])

  // Step 1: Upload state
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 2: Mapping & Preview state
  const [tempFileId, setTempFileId] = useState<string>('')
  const [sheets, setSheets] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [headers, setHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [confidence, setConfidence] = useState<Record<string, number>>({})
  const [totalRows, setTotalRows] = useState<number>(0)
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [duplicateStrategy, setDuplicateStrategy] = useState<'SKIP' | 'UPDATE' | 'IMPORT_NEW'>('SKIP')
  const [switchingSheet, setSwitchingSheet] = useState(false)

  // Step 3 & 4: Execution & Progress state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [currentJobId, setCurrentJobId] = useState<string>('')
  const [jobStatus, setJobStatus] = useState<ImportJobSummary | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  // History state
  const [historyJobs, setHistoryJobs] = useState<ImportJobSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)

  // Load target fields on mount
  useEffect(() => {
    adminAPI.getTargetFields()
      .then((res) => {
        setTargetFields(res.data?.data?.fields || [])
      })
      .catch((err) => console.error('Failed to load target fields:', err))
  }, [])

  // Load history when tab changes
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory(historyPage)
    }
  }, [activeTab, historyPage])

  const fetchHistory = async (page = 1) => {
    setHistoryLoading(true)
    try {
      const res = await adminAPI.getImportHistory({ page, limit: 10 })
      setHistoryJobs(res.data?.data?.jobs || [])
      if (res.data?.data?.pagination) {
        setHistoryTotalPages(res.data.data.pagination.totalPages)
        setHistoryPage(res.data.data.pagination.page)
      }
    } catch {
      toast.error('Failed to load import history')
    } finally {
      setHistoryLoading(false)
    }
  }

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0])
    }
  }

  const handleFileSelected = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv', 'ods'].includes(ext || '')) {
      toast.error('Only .xlsx, .xls, .csv, and .ods spreadsheet formats are supported.')
      return
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error('File size exceeds the 50MB limit.')
      return
    }
    setFile(selectedFile)
  }

  // Upload and parse file with AI mapping
  const handleUploadAndAnalyze = async () => {
    if (!file) {
      toast.error('Please choose an Excel or CSV file first.')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await adminAPI.uploadImportFile(formData)
      const data = res.data?.data
      if (!data) throw new Error('Invalid response from server')

      setTempFileId(data.tempFileId)
      setSheets(data.sheets || [])
      setSelectedSheet(data.selectedSheet || '')
      setHeaders(data.headers || [])
      setMappings(data.mappings || {})
      setConfidence(data.confidence || {})
      setTotalRows(data.totalRows || 0)
      setPreviewRows(data.previewRows || [])
      setStats(data.stats || null)
      setStep(2)
      toast.success(`AI analyzed ${data.totalRows} rows successfully!`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to process file')
    } finally {
      setUploading(false)
    }
  }

  // Handle Sheet Change
  const handleSheetChange = async (newSheet: string) => {
    if (newSheet === selectedSheet) return
    setSelectedSheet(newSheet)
    setSwitchingSheet(true)
    try {
      const res = await adminAPI.parseImportSheet({ tempFileId, sheetName: newSheet })
      const data = res.data?.data
      if (data) {
        setHeaders(data.headers || [])
        setMappings(data.mappings || {})
        setConfidence(data.confidence || {})
        setTotalRows(data.totalRows || 0)
        setPreviewRows(data.previewRows || [])
        toast.success(`Switched to sheet: ${newSheet}`)
      }
    } catch {
      toast.error('Failed to parse sheet')
    } finally {
      setSwitchingSheet(false)
    }
  }

  // Update Mapping Override
  const handleMappingChange = (header: string, targetField: string) => {
    setMappings((prev) => {
      const next = { ...prev }
      if (!targetField || targetField === 'IGNORE') {
        delete next[header]
      } else {
        next[header] = targetField
      }
      return next
    })
  }

  // Execute Import
  const handleExecuteImport = async () => {
    if (!tempFileId) return
    setIsExecuting(true)
    setStep(3)

    try {
      const res = await adminAPI.executeImport({
        tempFileId,
        sheetName: selectedSheet,
        mappings,
        duplicateStrategy,
      })
      const jobId = res.data?.data?.jobId
      if (!jobId) throw new Error('No job ID returned')
      setCurrentJobId(jobId)

      // Start polling for progress
      pollJobProgress(jobId)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to start import')
      setIsExecuting(false)
      setStep(2)
    }
  }

  // Poll Job Progress
  const pollJobProgress = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await adminAPI.getImportJobProgress(jobId)
        const job = res.data?.data?.job
        if (job) {
          setJobStatus(job)
          if (job.status === 'COMPLETED' || job.status === 'FAILED') {
            clearInterval(interval)
            setIsExecuting(false)
            setStep(4)
            if (job.status === 'COMPLETED') {
              toast.success(`Database import completed! ${job.successCount} candidates imported.`)
            } else {
              toast.error('Import completed with errors. Check details.')
            }
          }
        }
      } catch (err) {
        console.error('Error polling job progress:', err)
      }
    }, 1500)
  }

  // Download Sample Template
  const handleDownloadTemplate = async () => {
    try {
      const res = await adminAPI.downloadImportTemplate()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'CareerWings_Candidate_Import_Template.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Template downloaded!')
    } catch {
      toast.error('Failed to download template')
    }
  }

  // Download Report
  const handleDownloadReport = async (jobId: string) => {
    try {
      const res = await adminAPI.downloadImportReport(jobId)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Import_Report_${jobId}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      toast.error('Failed to download report file')
    }
  }

  // Download Original
  const handleDownloadOriginal = async (jobId: string) => {
    try {
      const res = await adminAPI.downloadOriginalImportFile(jobId)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Uploaded_File_${jobId}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      toast.error('Failed to download original file')
    }
  }

  // Reset to start over
  const handleReset = () => {
    setFile(null)
    setTempFileId('')
    setSheets([])
    setSelectedSheet('')
    setHeaders([])
    setMappings({})
    setConfidence({})
    setTotalRows(0)
    setPreviewRows([])
    setStats(null)
    setCurrentJobId('')
    setJobStatus(null)
    setIsExecuting(false)
    setStep(1)
  }

  return (
    <AdminLayout>
      <SEOMeta title="AI Smart Candidate Database Import | Career Wings" />

      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Automated AI Recruiter Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              AI Smart Jobseeker Database Import
            </h1>
            <p className="text-slate-500 text-sm mt-1 max-w-3xl">
              Upload candidate databases in any Excel or CSV structure. The AI automatically detects column headers, standardizes messy phone numbers and salaries, identifies duplicates, and populates the live portal.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium rounded-xl shadow-sm transition"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Sample Template (.xlsx)
            </button>

            <Link
              to="/admin/candidates"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm transition"
            >
              <Users className="w-4 h-4" />
              Candidates Directory
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-px">
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'import'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Import Wizard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            Import History & Reports
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: IMPORT WIZARD */}
        {/* ========================================================================= */}
        {activeTab === 'import' && (
          <div className="space-y-8">
            {/* Step Progress Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {[
                { num: 1, title: 'Upload Spreadsheet', desc: 'Excel, CSV, ODS up to 50MB' },
                { num: 2, title: 'AI Mapping & Preview', desc: 'Auto-detected columns & duplicates' },
                { num: 3, title: 'Batch Processing', desc: 'Live chunks & database inserts' },
                { num: 4, title: 'Report & Verification', desc: 'Download result spreadsheets' },
              ].map((s) => (
                <div
                  key={s.num}
                  className={`p-4 rounded-2xl border transition ${
                    step === s.num
                      ? 'bg-indigo-50/70 border-indigo-200 ring-2 ring-indigo-500/20'
                      : step > s.num
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-white border-slate-200/80 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                        step === s.num
                          ? 'bg-indigo-600 text-white'
                          : step > s.num
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{s.title}</h4>
                      <p className="text-[11px] text-slate-500">{s.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* STEP 1: UPLOAD ZONE */}
            {step === 1 && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-10 space-y-8">
                <div className="text-center max-w-xl mx-auto space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">Upload Candidate Database File</h3>
                  <p className="text-sm text-slate-500">
                    No need to reformat columns or adjust sheet order. Antigravity AI reads all variations of names, numbers, degrees, and salaries automatically.
                  </p>
                </div>

                {/* Dropzone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                    isDragOver
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : file
                      ? 'border-emerald-400 bg-emerald-50/30'
                      : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.ods"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {file ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                        <FileSpreadsheet className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">{file.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for AI analysis
                        </p>
                      </div>
                      <span className="inline-block text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                        Click or drag to change file
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-slate-900">
                          Click to browse or drag and drop your file here
                        </h4>
                        <p className="text-xs text-slate-500">
                          Supported file types: <span className="font-semibold text-slate-700">.xlsx, .xls, .csv, .ods</span> (Up to 50MB)
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Production database protected • Safe batch processing</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Features Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      Zero Column Arranging
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      AI maps varying headers like "Applicant", "Mail ID", "Mobile", "Work Exp", "Present CTC" automatically.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Smart Duplicate Engine
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Prevents duplicate entries via mobile and email matching. Choose to Skip, Update, or Import as New.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
                      <Database className="w-3.5 h-3.5" />
                      High Capacity Bulk
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Chunked 500-record transactions handle up to 50,000 jobseekers smoothly with zero browser freezing.
                    </p>
                  </div>
                </div>

                {/* Upload Action */}
                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={!file || uploading}
                    onClick={handleUploadAndAnalyze}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition cursor-pointer"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        AI Reading & Detecting Columns...
                      </>
                    ) : (
                      <>
                        <span>Analyze & Map Columns</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: AI MAPPING & PREVIEW */}
            {step === 2 && (
              <div className="space-y-8">
                {/* File & Sheet Info Bar */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{file?.name}</h4>
                      <p className="text-xs text-slate-500">
                        {totalRows} data rows detected • {headers.length} spreadsheet columns
                      </p>
                    </div>
                  </div>

                  {sheets.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Active Sheet:</span>
                      <select
                        value={selectedSheet}
                        disabled={switchingSheet}
                        onChange={(e) => handleSheetChange(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {sheets.map((s) => (
                          <option key={s} value={s}>
                            Sheet: {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Validation Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                    <span className="text-xs font-medium text-slate-500">Total Rows</span>
                    <div className="text-2xl font-black text-slate-900">{totalRows}</div>
                    <span className="text-[11px] text-slate-400">Ready to process</span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                    <span className="text-xs font-medium text-slate-500">Valid in Sample</span>
                    <div className="text-2xl font-black text-emerald-600">
                      {stats?.validSampleCount || previewRows.filter((r) => r.status === 'READY').length}
                    </div>
                    <span className="text-[11px] text-emerald-600 font-medium">Valid contacts</span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                    <span className="text-xs font-medium text-slate-500">Duplicates Detected</span>
                    <div className="text-2xl font-black text-amber-600">
                      {stats?.duplicateSampleCount || previewRows.filter((r) => r.status === 'DUPLICATE').length}
                    </div>
                    <span className="text-[11px] text-amber-600 font-medium">Matches live records</span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                    <span className="text-xs font-medium text-slate-500">AI Mapped Columns</span>
                    <div className="text-2xl font-black text-indigo-600">
                      {Object.keys(mappings).length} / {headers.length}
                    </div>
                    <span className="text-[11px] text-indigo-600 font-medium">Auto-mapped</span>
                  </div>
                </div>

                {/* Duplicate Resolution Strategy */}
                <div className="bg-gradient-to-br from-indigo-50/50 to-slate-50 border border-indigo-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-bold text-slate-900">Duplicate Handling Strategy</h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    If an uploaded candidate's mobile number or email already exists in the live database, select how to handle the record:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label
                      className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                        duplicateStrategy === 'SKIP'
                          ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'bg-white/80 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">Skip Duplicates</span>
                          <input
                            type="radio"
                            name="strategy"
                            checked={duplicateStrategy === 'SKIP'}
                            onChange={() => setDuplicateStrategy('SKIP')}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                        </div>
                        <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Recommended
                        </span>
                        <p className="text-[11px] text-slate-500 mt-2">
                          Existing candidate accounts remain 100% untouched. Duplicates are logged in the downloadable skipped report.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                        duplicateStrategy === 'UPDATE'
                          ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'bg-white/80 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">Update Existing Records</span>
                          <input
                            type="radio"
                            name="strategy"
                            checked={duplicateStrategy === 'UPDATE'}
                            onChange={() => setDuplicateStrategy('UPDATE')}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                        </div>
                        <span className="inline-block text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          Enrich Data
                        </span>
                        <p className="text-[11px] text-slate-500 mt-2">
                          Safely updates empty fields with new valid information. Blank values in the upload will NEVER overwrite existing profile data.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                        duplicateStrategy === 'IMPORT_NEW'
                          ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'bg-white/80 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">Import as New</span>
                          <input
                            type="radio"
                            name="strategy"
                            checked={duplicateStrategy === 'IMPORT_NEW'}
                            onChange={() => setDuplicateStrategy('IMPORT_NEW')}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                        </div>
                        <span className="inline-block text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          Force Duplicate
                        </span>
                        <p className="text-[11px] text-slate-500 mt-2">
                          Creates a fresh separate candidate profile. System creates unique alias login if email collision occurs.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* AI Column Mapping Accordion / Table */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">AI Column Mapping Review</h3>
                      <p className="text-xs text-slate-500">
                        Check how each uploaded column maps to Career Wings database fields. You can override any mapping manually.
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>AI auto-detected {Object.keys(mappings).length} fields</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-200/60">
                        <tr>
                          <th className="py-3 px-4">Uploaded Excel Header</th>
                          <th className="py-3 px-4">Sample Values</th>
                          <th className="py-3 px-4">AI Confidence</th>
                          <th className="py-3 px-4">Target Database Field</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {headers.map((header) => {
                          const currentMapped = mappings[header] || ''
                          const conf = confidence[header] || 0
                          const sampleVal = previewRows[0]?.[header] || ''

                          return (
                            <tr key={header} className="hover:bg-slate-50/70 transition">
                              <td className="py-3 px-4 font-bold text-slate-800">
                                {header}
                              </td>
                              <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                                {sampleVal ? String(sampleVal) : <span className="text-slate-300 italic">Empty</span>}
                              </td>
                              <td className="py-3 px-4">
                                {currentMapped ? (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      conf >= 0.9
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    {Math.round(conf * 100)}% match
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px] italic">Not mapped</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <select
                                  value={currentMapped || 'IGNORE'}
                                  onChange={(e) => handleMappingChange(header, e.target.value)}
                                  className="w-full sm:w-64 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                  <option value="IGNORE">-- Ignore / Do Not Import --</option>
                                  {targetFields.map((tf) => (
                                    <option key={tf.field} value={tf.field}>
                                      {tf.label} {tf.required ? '★ (Required)' : ''}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Preview Table of First 25 Rows */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">First 20 Records Live Preview</h3>
                      <p className="text-xs text-slate-500">
                        Check how candidate records will look once cleaned, standardized, and saved into your database.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-200/60">
                        <tr>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3">Candidate Name</th>
                          <th className="py-3 px-3">Mobile</th>
                          <th className="py-3 px-3">Email Address</th>
                          <th className="py-3 px-3">Job Applied For</th>
                          <th className="py-3 px-3">Role / Designation</th>
                          <th className="py-3 px-3">Company</th>
                          <th className="py-3 px-3">Experience</th>
                          <th className="py-3 px-3">Salary</th>
                          <th className="py-3 px-3">Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewRows.slice(0, 20).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-3 whitespace-nowrap">
                              {row.status === 'READY' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Ready
                                </span>
                              )}
                              {row.status === 'DUPLICATE' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  Duplicate
                                </span>
                              )}
                              {row.status === 'INVALID' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  Invalid
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                              {row.fullName}
                            </td>
                            <td className="py-3 px-3 text-slate-700 font-mono whitespace-nowrap">
                              {row.phone || <span className="text-rose-400 italic">Missing</span>}
                            </td>
                            <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                              {row.isGeneratedEmail ? (
                                <span className="text-slate-400 italic">Auto-generated</span>
                              ) : (
                                row.email
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-800 whitespace-nowrap">
                              {row.jobAppliedFor || '—'}
                            </td>
                            <td className="py-3 px-3 text-slate-800 whitespace-nowrap">
                              {row.currentRole || '—'}
                            </td>
                            <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                              {row.currentCompany || '—'}
                            </td>
                            <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                              {row.totalExperience ? `${row.totalExperience} yrs` : 'Fresher'}
                            </td>
                            <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                              {row.currentSalary ? `₹${row.currentSalary.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                              {row.currentLocation || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Wizard Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-semibold rounded-xl transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Upload
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    className="inline-flex items-center gap-2 px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                    Confirm & Start AI Import ({totalRows} Rows)
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: BATCH PROCESSING PROGRESS */}
            {step === 3 && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 sm:p-14 max-w-2xl mx-auto text-center space-y-8">
                <div className="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner animate-pulse">
                  <RefreshCw className="w-10 h-10 animate-spin" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900">
                    Importing Candidate Database...
                  </h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    Antigravity AI is standardizing records, hashing credentials, connecting skills, and executing safe batch transactions.
                  </p>
                </div>

                {/* Progress Bar */}
                {jobStatus && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>Progress</span>
                      <span>
                        {jobStatus.processedRows} of {jobStatus.totalRows} records (
                        {Math.round((jobStatus.processedRows / (jobStatus.totalRows || 1)) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.round((jobStatus.processedRows / (jobStatus.totalRows || 1)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Real-time counters */}
                {jobStatus && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">Imported</span>
                      <div className="text-xl font-black text-emerald-700">{jobStatus.successCount}</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                      <span className="text-[10px] font-bold text-blue-700 uppercase">Updated</span>
                      <div className="text-xl font-black text-blue-700">{jobStatus.updatedCount}</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                      <span className="text-[10px] font-bold text-amber-700 uppercase">Skipped</span>
                      <div className="text-xl font-black text-amber-700">{jobStatus.skippedCount}</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-center">
                      <span className="text-[10px] font-bold text-rose-700 uppercase">Failed</span>
                      <div className="text-xl font-black text-rose-700">{jobStatus.failedCount}</div>
                    </div>
                  </div>
                )}

                <div className="inline-flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Chunked batch transactions prevent timeouts and protect live records</span>
                </div>
              </div>
            )}

            {/* STEP 4: FINAL REPORT */}
            {step === 4 && jobStatus && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 sm:p-12 max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">
                    Candidate Import Completed!
                  </h3>
                  <p className="text-sm text-slate-500">
                    The database has been updated successfully. Your new candidates are now visible in the Candidate Directory.
                  </p>
                </div>

                {/* Final Stats Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 rounded-3xl bg-slate-50 border border-slate-100">
                  <div className="text-center space-y-1">
                    <span className="text-xs text-slate-500 font-medium">New Candidates</span>
                    <div className="text-2xl font-black text-emerald-600">{jobStatus.successCount}</div>
                  </div>

                  <div className="text-center space-y-1">
                    <span className="text-xs text-slate-500 font-medium">Existing Updated</span>
                    <div className="text-2xl font-black text-blue-600">{jobStatus.updatedCount}</div>
                  </div>

                  <div className="text-center space-y-1">
                    <span className="text-xs text-slate-500 font-medium">Duplicates Skipped</span>
                    <div className="text-2xl font-black text-amber-600">{jobStatus.skippedCount}</div>
                  </div>

                  <div className="text-center space-y-1">
                    <span className="text-xs text-slate-500 font-medium">Failed / Invalid</span>
                    <div className="text-2xl font-black text-rose-600">
                      {jobStatus.failedCount + jobStatus.invalidCount}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadReport(jobStatus.id)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition"
                  >
                    <Download className="w-4 h-4" />
                    Download Import Report (.xlsx)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadOriginal(jobStatus.id)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-sm rounded-xl transition"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    Original File
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    Import Another File
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: IMPORT HISTORY & REPORTS */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Past Candidate Database Imports</h3>
                <p className="text-xs text-slate-500">
                  Every import session is archived here. You can download Excel reports or the original files at any time.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fetchHistory(historyPage)}
                disabled={historyLoading}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                Refresh History
              </button>
            </div>

            {historyLoading ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                Loading past imports...
              </div>
            ) : historyJobs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                <FileSpreadsheet className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                No past candidate imports found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-200/60">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">File Name</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Strategy</th>
                      <th className="py-3 px-4">Processed</th>
                      <th className="py-3 px-4">Imported</th>
                      <th className="py-3 px-4">Updated</th>
                      <th className="py-3 px-4">Skipped</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {new Date(job.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">
                          {job.fileName}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              job.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : job.status === 'PROCESSING'
                                ? 'bg-blue-100 text-blue-800 animate-pulse'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {job.duplicateStrategy}
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-semibold whitespace-nowrap">
                          {job.processedRows} / {job.totalRows}
                        </td>
                        <td className="py-3 px-4 text-emerald-600 font-bold whitespace-nowrap">
                          {job.successCount}
                        </td>
                        <td className="py-3 px-4 text-blue-600 font-bold whitespace-nowrap">
                          {job.updatedCount}
                        </td>
                        <td className="py-3 px-4 text-amber-600 font-bold whitespace-nowrap">
                          {job.skippedCount}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {job.reportPath && (
                              <button
                                type="button"
                                onClick={() => handleDownloadReport(job.id)}
                                title="Download Excel Report"
                                className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDownloadOriginal(job.id)}
                              title="Download Original File"
                              className="p-1.5 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
