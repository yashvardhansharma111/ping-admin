'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, usersApi, AdminUser } from '@/lib/api';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Warned', value: 'warned' },
  { label: 'Temp Banned', value: 'temp_banned' },
  { label: 'Perm Banned', value: 'perm_banned' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border border-green-200',
  warned: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  temp_banned: 'bg-orange-50 text-orange-700 border border-orange-200',
  perm_banned: 'bg-red-50 text-red-700 border border-red-200',
};

function Avatar({ user }: { user: AdminUser }) {
  const initials = (user.displayName || user.username || '?').slice(0, 2).toUpperCase();
  const colors = ['bg-violet-100 text-violet-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-orange-100 text-orange-700'];
  const color = colors[initials.charCodeAt(0) % colors.length];
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={initials} className="h-9 w-9 rounded-full object-cover" />;
  }
  return (
    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold ${color}`}>
      {initials}
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 animate-pulse rounded bg-gray-100" style={{ width: i === 0 ? '140px' : '80px' }} />
        </td>
      ))}
    </tr>
  );
}

type ConfirmState = { userId: string; action: 'ban1' | 'ban7' | 'perm' | 'unban' } | null;

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [actionLoading, setActionLoading] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
  }, [router]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await usersApi.list(page, debouncedSearch, status);
      setUsers(res.users);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleAction(confirm: ConfirmState) {
    if (!confirm) return;
    const { userId, action } = confirm;
    setActionLoading(userId);
    setConfirm(null);
    try {
      if (action === 'unban') {
        await usersApi.unban(userId);
      } else if (action === 'ban1') {
        await usersApi.ban(userId, 'temp', 1, 'Admin action');
      } else if (action === 'ban7') {
        await usersApi.ban(userId, 'temp', 7, 'Admin action');
      } else if (action === 'perm') {
        await usersApi.ban(userId, 'perm', undefined, 'Admin action');
      }
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading('');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">{total.toLocaleString()} total users</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Confirm banner */}
      {confirm && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-amber-800">
            {confirm.action === 'unban' ? 'Unban this user?' :
             confirm.action === 'ban1' ? 'Ban for 1 day?' :
             confirm.action === 'ban7' ? 'Ban for 7 days?' :
             'Permanently ban this user?'}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirm(null)} className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => handleAction(confirm)}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, username, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatus(tab.value); setPage(1); }}
              className={[
                'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                status === tab.value
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Trust</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
                : users.length === 0
                ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                      No users found
                    </td>
                  </tr>
                )
                : users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar user={user} />
                        <span className="font-medium text-gray-900 max-w-[140px] truncate">
                          {user.displayName || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">
                      {user.username ? `@${user.username}` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 font-mono text-xs">{user.phone}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${user.trustRate}%`,
                              backgroundColor: user.trustRate >= 70 ? '#22C55E' : user.trustRate >= 40 ? '#F59E0B' : '#EF4444',
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{user.trustRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[user.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {user.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">
                      {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5">
                      {actionLoading === user._id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-violet-600" />
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {user.status !== 'perm_banned' && (
                            <>
                              <button
                                onClick={() => setConfirm({ userId: user._id, action: 'ban1' })}
                                className="rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100 transition-colors"
                              >
                                Ban 1d
                              </button>
                              <button
                                onClick={() => setConfirm({ userId: user._id, action: 'ban7' })}
                                className="rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100 transition-colors"
                              >
                                Ban 7d
                              </button>
                              <button
                                onClick={() => setConfirm({ userId: user._id, action: 'perm' })}
                                className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                              >
                                Perm Ban
                              </button>
                            </>
                          )}
                          {(user.status === 'temp_banned' || user.status === 'perm_banned') && (
                            <button
                              onClick={() => setConfirm({ userId: user._id, action: 'unban' })}
                              className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                            >
                              Unban
                            </button>
                          )}
                        </div>
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
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages} &middot; {total} users
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
