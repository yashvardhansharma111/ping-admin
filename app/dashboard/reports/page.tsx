'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, reportsApi, Report } from '@/lib/api';

const TABS = [
  { label: 'All Pending', value: 'all' },
  { label: 'Pings', value: 'pings' },
  { label: 'Users', value: 'users' },
  { label: 'Ads', value: 'ads' },
  { label: 'Messages', value: 'messages' },
  { label: 'Resolved', value: 'resolved' },
];

const TYPE_BADGE: Record<string, { label: string; icon: string; color: string }> = {
  ping:    { label: 'Ping',    icon: '📍', color: 'bg-violet-50 text-violet-700 border border-violet-200' },
  user:    { label: 'User',    icon: '👤', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
  ad:      { label: 'Ad',      icon: '📢', color: 'bg-orange-50 text-orange-700 border border-orange-200' },
  message: { label: 'Message', icon: '💬', color: 'bg-gray-50 text-gray-700 border border-gray-200' },
};

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-yellow-50 text-yellow-700 border border-yellow-200',
  escalated: 'bg-orange-50 text-orange-700 border border-orange-200',
  resolved:  'bg-green-50 text-green-700 border border-green-200',
  dismissed: 'bg-gray-50 text-gray-500 border border-gray-200',
};

function SkeletonRow() {
  return (
    <tr>
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 animate-pulse rounded bg-gray-100" style={{ width: i === 1 ? '160px' : '80px' }} />
        </td>
      ))}
    </tr>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
  }, [router]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await reportsApi.list(page, tab);
      setReports(res.items ?? []);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [page, tab]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  async function doAction(id: string, action: 'dismiss' | 'remove') {
    if (action === 'remove') {
      const reason = window.prompt('Reason for removing this content:');
      if (!reason?.trim()) return;
      setActionLoading(id + action);
      try {
        await reportsApi.remove(id, reason.trim());
        fetchReports();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed');
      } finally {
        setActionLoading('');
      }
      return;
    }
    setActionLoading(id + action);
    try {
      await reportsApi.dismiss(id);
      fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading('');
    }
  }

  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function getReporterName(r: Report): string {
    if (r.reporterId && typeof r.reporterId === 'object') {
      return r.reporterId.displayName || r.reporterId.username || 'Unknown';
    }
    return r.reporterId ? String(r.reporterId).slice(-6) : 'Unknown';
  }

  const isResolved = tab === 'resolved';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">{total.toLocaleString()} reports</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setTab(t.value); setPage(1); }}
            className={[
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              tab === t.value
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Reported By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                {!isResolved && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
                : reports.length === 0
                ? (
                  <tr>
                    <td colSpan={isResolved ? 5 : 6} className="px-4 py-12 text-center text-sm text-gray-400">
                      No reports found
                    </td>
                  </tr>
                )
                : reports.map((report) => {
                  const typeConfig = TYPE_BADGE[report.targetType] ?? { label: report.targetType, icon: '?', color: 'bg-gray-50 text-gray-600 border border-gray-200' };
                  return (
                    <tr key={report._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${typeConfig.color}`}>
                          <span>{typeConfig.icon}</span>
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 max-w-[200px]">
                        <p className="truncate">{report.reason}</p>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500">{getReporterName(report)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[report.status] ?? 'bg-gray-50 text-gray-600'}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs">
                        {new Date(report.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      {!isResolved && (
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => doAction(report._id, 'remove')}
                              disabled={!!actionLoading}
                              className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                            >
                              {actionLoading === report._id + 'remove' ? '…' : 'Remove'}
                            </button>
                            <button
                              onClick={() => doAction(report._id, 'dismiss')}
                              disabled={!!actionLoading}
                              className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                              {actionLoading === report._id + 'dismiss' ? '…' : 'Dismiss'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <span className="text-sm text-gray-500">Page {page} of {totalPages} &middot; {total} reports</span>
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
