import React, { useState, useEffect } from 'react'
import { candidateAPI } from '@/lib/api'
import CandidateLayout from '@/components/layout/CandidateLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { Bell, Plus, Trash2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { JobAlert } from '@/types'

export default function JobAlerts() {
  const [alerts, setAlerts] = useState<JobAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newKeyword, setNewKeyword] = useState('')
  const [newLocation, setNewLocation] = useState('')

  const fetchAlerts = async () => {
    try {
      const res = await candidateAPI.getAlerts()
      setAlerts(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await candidateAPI.createAlert({
        title: newTitle,
        keyword: newKeyword,
        locationText: newLocation,
      })
      toast.success('Job alert created!')
      setShowModal(false)
      setNewTitle('')
      setNewKeyword('')
      setNewLocation('')
      fetchAlerts()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create alert')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await candidateAPI.deleteAlert(id)
      toast.success('Alert deleted')
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    } catch {
      toast.error('Failed to delete alert')
    }
  }

  return (
    <CandidateLayout>
      <SEOMeta title="Job Alerts | Career Wings" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Job Alerts</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Receive automatic email notifications when jobs matching your keywords are posted in Assam & Northeast.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Create Alert
          </button>
        </div>

        {/* Alerts List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{alert.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Keyword: {alert.keyword || 'Any'} • Location: {alert.locationText || 'Guwahati / Assam'} • Frequency: {alert.frequency || 'Daily'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(alert.id || alert._id || '')}
                  className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-slate-700 text-base">No active job alerts</p>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              Create an alert to get notified the moment a matching job is published.
            </p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Your First Alert
            </button>
          </div>
        )}

        {/* Create Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Create Job Alert</h3>
              <form onSubmit={handleCreateAlert} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Alert Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Civil Construction Jobs Guwahati"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Target Keyword / Role
                  </label>
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="e.g. Site Supervisor, Accountant, React"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. Guwahati, Assam"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary text-sm">
                    Save Alert
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </CandidateLayout>
  )
}
