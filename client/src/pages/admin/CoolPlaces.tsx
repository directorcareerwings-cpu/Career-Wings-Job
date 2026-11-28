import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Plus, Pencil, Trash2, Upload, ExternalLink, Star,
  ToggleLeft, ToggleRight, X, Save, GripVertical, Image,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface CoolPlaceLogo {
  id: string
  name: string
  logoUrl: string
  website?: string
  displayOrder: number
  isActive: boolean
}

const EMPTY_FORM = { name: '', logoUrl: '', website: '', displayOrder: 0, isActive: true }

export default function AdminCoolPlaces() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<CoolPlaceLogo | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-cool-places'],
    queryFn: () => adminAPI.getCoolPlaces().then((r) => r.data?.data || []),
  })
  const logos: CoolPlaceLogo[] = data || []

  const saveMutation = useMutation({
    mutationFn: () =>
      editItem
        ? adminAPI.updateCoolPlace(editItem.id, form)
        : adminAPI.createCoolPlace(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cool-places'] })
      queryClient.invalidateQueries({ queryKey: ['cool-places-public'] })
      toast.success(editItem ? 'Company updated!' : 'Company added!')
      setShowModal(false)
    },
    onError: () => toast.error('Failed to save'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminAPI.deleteCoolPlace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cool-places'] })
      queryClient.invalidateQueries({ queryKey: ['cool-places-public'] })
      toast.success('Company removed')
    },
    onError: () => toast.error('Failed to delete'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminAPI.updateCoolPlace(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cool-places'] })
      queryClient.invalidateQueries({ queryKey: ['cool-places-public'] })
    },
    onError: () => toast.error('Failed to update'),
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)  // must match multer .single('image')
      const res = await adminAPI.uploadCoolPlaceLogo(fd)
      const logoUrl = res.data?.data?.logoUrl || ''
      setForm((f) => ({ ...f, logoUrl }))
      toast.success('Logo uploaded!')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const openAdd = () => {
    setEditItem(null)
    setForm({ ...EMPTY_FORM, displayOrder: logos.length + 1 })
    setShowModal(true)
  }

  const openEdit = (logo: CoolPlaceLogo) => {
    setEditItem(logo)
    setForm({ name: logo.name, logoUrl: logo.logoUrl, website: logo.website || '', displayOrder: logo.displayOrder, isActive: logo.isActive })
    setShowModal(true)
  }

  const handleDelete = (logo: CoolPlaceLogo) => {
    if (!window.confirm(`Remove "${logo.name}" from Cool Places to Work?`)) return
    deleteMutation.mutate(logo.id)
  }

  return (
    <AdminLayout>
      <SEOMeta title="Cool Places to Work | Admin | Career Wings" />
      <div className="max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cool Places to Work</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Manage the scrolling company logo showcase on the homepage.
            </p>
          </div>
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openAdd}>
            Add Company
          </Button>
        </div>

        {/* Preview Banner */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 overflow-hidden">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3 text-center">Preview — Homepage Ticker</p>
          <div className="flex gap-3 overflow-hidden">
            {logos.filter((l) => l.isActive).slice(0, 6).map((logo) => (
              <div
                key={logo.id}
                className="flex items-center justify-center bg-white rounded-xl border border-gray-100 shadow-xs px-4 py-2.5 w-[164px] h-[72px] shrink-0"
              >
                <div className="w-[124px] h-[40px] flex items-center justify-center overflow-hidden">
                  <img
                    src={logo.logoUrl}
                    alt={logo.name}
                    className="w-full h-full object-contain"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              </div>
            ))}
            {logos.filter((l) => l.isActive).length === 0 && (
              <p className="text-sm text-amber-600 italic mx-auto">No active logos yet — add your first company below.</p>
            )}
          </div>
        </div>

        {/* Logo List */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 px-5 py-3 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>#</span>
            <span>Company</span>
            <span>Order</span>
            <span>Website</span>
            <span>Active</span>
            <span>Actions</span>
          </div>

          {isLoading && (
            <div className="p-8 text-center text-slate-400 animate-pulse">Loading…</div>
          )}

          {!isLoading && logos.length === 0 && (
            <div className="p-10 text-center">
              <Star className="h-10 w-10 text-amber-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-600">No company logos yet</p>
              <p className="text-sm text-slate-400 mt-1">Add your first company to start the ticker.</p>
            </div>
          )}

          {logos.map((logo, idx) => (
            <div
              key={logo.id}
              className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 items-center px-5 py-3.5 border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${!logo.isActive ? 'opacity-50' : ''}`}
            >
              <span className="text-slate-400 font-mono text-xs">{idx + 1}</span>

              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-14 h-10 rounded-lg bg-gray-50 border border-gray-100 shrink-0">
                  <img
                    src={logo.logoUrl}
                    alt={logo.name}
                    className="max-h-7 max-w-[52px] w-auto object-contain"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{logo.name}</p>
                  <p className="text-xs text-slate-400 truncate max-w-[200px]">{logo.logoUrl}</p>
                </div>
              </div>

              <span className="text-xs text-slate-500 font-mono">{logo.displayOrder}</span>

              <div>
                {logo.website ? (
                  <a href={logo.website} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-700 transition-colors">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <span className="text-slate-300 text-xs">—</span>
                )}
              </div>

              <button
                onClick={() => toggleMutation.mutate({ id: logo.id, isActive: !logo.isActive })}
                className={`transition-colors ${logo.isActive ? 'text-emerald-500 hover:text-emerald-700' : 'text-slate-300 hover:text-slate-500'}`}
                title={logo.isActive ? 'Deactivate' : 'Activate'}
              >
                {logo.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openEdit(logo)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(logo)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editItem ? 'Edit Company' : 'Add Company Logo'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="e.g. Tata Consultancy Services"
                />
              </div>

              {/* Logo Upload or URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Logo</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={form.logoUrl}
                    onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="https://... or upload below"
                  />
                  {form.logoUrl && (
                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gray-50 border border-gray-200 shrink-0">
                      <img
                        src={form.logoUrl}
                        alt="preview"
                        className="max-h-7 max-w-[38px] object-contain"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-colors disabled:opacity-60"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? 'Uploading…' : 'Upload Image'}
                  </button>
                  <span className="text-xs text-slate-400">PNG, SVG, JPG — max 2MB</span>
                  <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Careers / Website URL</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="https://company.com/careers"
                />
              </div>

              {/* Order & Active */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Display Order</label>
                  <input
                    type="number"
                    value={form.displayOrder}
                    onChange={(e) => setForm((f) => ({ ...f, displayOrder: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                    className={`w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${form.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                  >
                    {form.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    {form.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                leftIcon={<Save className="h-4 w-4" />}
                onClick={() => saveMutation.mutate()}
                disabled={!form.name || !form.logoUrl || saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
