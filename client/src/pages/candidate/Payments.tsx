import React, { useState, useEffect } from 'react'
import { candidateAPI } from '@/lib/api'
import CandidateLayout from '@/components/layout/CandidateLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { CreditCard, Calendar, CheckCircle2, AlertCircle } from 'lucide-react'

export default function CandidatePayments() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await candidateAPI.getPayments()
        setPayments(res.data.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchPayments()
  }, [])

  return (
    <CandidateLayout>
      <SEOMeta title="Payment History | Career Wings" />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payment History</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Invoices and transaction receipts for package upgrades.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 animate-pulse h-48" />
        ) : payments.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Invoice No</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3.5 px-4 text-slate-600">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                      {p.invoiceNumber || p.id.slice(0, 10)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          p.status === 'SUCCESS'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-slate-700 text-base">No transaction records</p>
            <p className="text-xs text-slate-400 mt-1">
              You haven't made any paid booster plan transactions yet.
            </p>
          </div>
        )}
      </div>
    </CandidateLayout>
  )
}
