'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, paymentsApi, Payment } from '@/lib/api';

const STATUS_BADGE: Record<string, string> = {
  paid:      'bg-green-50 text-green-700 border border-green-200',
  created:   'bg-blue-50 text-blue-700 border border-blue-200',
  failed:    'bg-red-50 text-red-700 border border-red-200',
  refunded:  'bg-gray-100 text-gray-500 border border-gray-200',
  attempted: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
};

function SkeletonRow() {
  return (
    <tr>
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 animate-pulse rounded bg-gray-100" style={{ width: i === 0 ? '140px' : '90px' }} />
        </td>
      ))}
    </tr>
  );
}

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refunding, setRefunding] = useState('');
  const [refundConfirm, setRefundConfirm] = useState('');
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
  }, [router]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await paymentsApi.list(page);
      setPayments(res.items ?? []);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  async function handleRefund(id: string) {
    if (refundConfirm !== id) { setRefundConfirm(id); return; }
    setRefundConfirm('');
    setRefunding(id);
    try {
      await paymentsApi.refund(id, 'Admin initiated refund');
      fetchPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refund failed');
    } finally {
      setRefunding('');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function getUserName(p: Payment): string {
    if (p.userId && typeof p.userId === 'object') {
      return p.userId.displayName || p.userId.username || p.userId.phone || 'Unknown';
    }
    return p.userId ? String(p.userId).slice(-6) : 'Unknown';
  }

  function formatAmount(p: Payment): string {
    return `₹${(p.amountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="mt-1 text-sm text-gray-500">{total.toLocaleString()} total transactions</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Confirm refund banner */}
      {refundConfirm && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-amber-800">Confirm refund for this payment?</p>
          <div className="flex gap-2">
            <button onClick={() => setRefundConfirm('')} className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => handleRefund(refundConfirm)}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              Yes, Refund
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan / Purpose</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
                : payments.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                      No payments found
                    </td>
                  </tr>
                )
                : payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-gray-900">{getUserName(payment)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        {payment.planId && (
                          <span className="font-medium text-gray-800">{payment.planId}</span>
                        )}
                        {payment.purpose && (
                          <span className="text-xs text-gray-400">{payment.purpose}</span>
                        )}
                        {!payment.planId && !payment.purpose && (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-gray-900">{formatAmount(payment)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[payment.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">
                      {new Date(payment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5">
                      {payment.status === 'paid' && (
                        refunding === payment._id
                          ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-violet-600" />
                          : (
                            <button
                              onClick={() => handleRefund(payment._id)}
                              className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                            >
                              Refund
                            </button>
                          )
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <span className="text-sm text-gray-500">Page {page} of {totalPages} &middot; {total} payments</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
