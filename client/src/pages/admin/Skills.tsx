import React, { useState, useEffect } from 'react'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { Award, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Skill } from '@/types'

export default function AdminSkills() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')

  const fetchSkills = async () => {
    try {
      const res = await adminAPI.getSkills()
      setSkills(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSkills()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await adminAPI.createSkill({ name })
      toast.success('Skill added')
      setShowModal(false)
      setName('')
      fetchSkills()
    } catch {
      toast.error('Failed to add skill')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await adminAPI.deleteSkill(id)
      toast.success('Skill deleted')
      fetchSkills()
    } catch {
      toast.error('Failed to delete skill')
    }
  }

  return (
    <AdminLayout>
      <SEOMeta title="Skills Directory (Admin) | Career Wings" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Skills Directory</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Standardized skill tags for candidate profiles and job requirements.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Add Skill
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 animate-pulse h-48" />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Skill Name</th>
                  <th className="py-3 px-4 font-semibold">Slug</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {skills.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500">{s.slug}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id || s._id || '')}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Add Skill Tag</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Skill Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Next.js, Site Quality Survey"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary text-sm">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
