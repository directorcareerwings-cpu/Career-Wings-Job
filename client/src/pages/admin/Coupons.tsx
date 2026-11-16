import React, { useState, useEffect } from 'react'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { Tag, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    minOrderAmount: 200,
    description: '',
  })

  const fetchCoupons = async () => {
    try {
      const res = await adminAPI.getCoupons()
      setCoupons(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await adminAPI.createCoupon(form)
      toast.success('Coupon created')
      setShowModal(false)
      fetchCoupons()
    } catch {
      toast.error('Failed to create coupon')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await adminAPI.deleteCoupon(id)
      toast.success('Coupon deleted')
      fetchCoupons()
    } catch {
      toast.error('Failed to delete coupon')
    }
  }

  return (
    <AdminLayout>
      <SEOMeta title="Discount Coupons (Admin) | Career Wings" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Coupons & Promo Codes</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Manage promotional campaign discounts for employers and candidates.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Create Coupon
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 animate-pulse h-48" />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Promo Code</th>
                  <th className="py-3 px-4 font-semibold">Discount</th>
                  <th className="py-3 px-4 font-semibold">Min Spend</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3.5 px-4 font-mono font-bold text-orange-600">{c.code}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% Off` : `₹${c.discountValue} Off`}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">₹{c.minOrderAmount}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
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
              <h3 className="text-lg font-bold text-slate-900">Create Discount Coupon</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Coupon Code
                  </label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. WINGS50"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Type
                    </label>
                    <select
                      value={form.discountType}
                      onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED">Flat (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Value
                    </label>
                    <input
                      type="number"
                      required
                      value={form.discountValue}
                      onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary text-sm">
                    Save Coupon
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
