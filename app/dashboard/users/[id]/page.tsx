'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isLoggedIn, usersApi, AdminUserDetail, AdminActivity } from '@/lib/api';

const STATUS_BADGE: Record<string, string> = {
  active:      'bg-green-50 text-green-700 border border-green-200',
  warned:      'bg-yellow-50 text-yellow-700 border border-yellow-200',
  temp_banned: 'bg-orange-50 text-orange-700 border border-orange-200',
  perm_banned: 'bg-red-50 text-red-700 border border-red-200',
};

const VERIFY_BADGE: Record<string, string> = {
  verified: 'bg-green-50 text-green-700 border border-green-200',
  pending:  'bg-yellow-50 text-yellow-700 border border-yellow-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
  none:     'bg-gray-50 text-gray-500 border border-gray-200',
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-800 break-all">{value}</p>
    </div>
  );
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [pingCount, setPingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
  }, [router]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    usersApi.detail(id)
      .then((res) => {
        setUser(res.user);
        setActivities(res.activities);
        setPingCount(res.pingCount);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load user'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-violet-600" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div>
        <button onClick={() => router.back()} className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error || 'User not found'}
        </div>
      </div>
    );
  }

  const joinDate = new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const lastActive = user.lastActiveAt
    ? new Date(user.lastActiveAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  const initials = (user.displayName || user.username || '?').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-3xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="mb-5 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        All users
      </button>

      {/* Header card */}
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6 mb-5">
        <div className="flex items-start gap-4">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={initials} className="h-16 w-16 rounded-full object-cover border border-gray-100 shrink-0" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xl font-bold shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{user.displayName || '—'}</h1>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[user.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {user.status.replace('_', ' ')}
              </span>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${VERIFY_BADGE[user.verificationStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                {user.verificationStatus === 'verified' ? '✓ Verified' : user.verificationStatus}
              </span>
            </div>
            {user.username && <p className="text-sm text-gray-500 mt-0.5">@{user.username}</p>}
            <p className="text-xs text-gray-400 mt-1">Joined {joinDate}{lastActive ? ` · Last active ${lastActive}` : ''}</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat label="Total Pings" value={pingCount} />
        <Stat label="Trust Rate" value={`${user.trustRate ?? 0}%`} />
        <Stat label="Strikes" value={user.strikeCount ?? 0} />
      </div>

      {/* Info card */}
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Contact & Identity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Phone" value={user.phone} />
          <Field label="Email" value={user.email} />
          <Field label="Gender" value={user.gender} />
          <Field label="Date of birth" value={user.dob ? new Date(user.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
          {user.bannedUntil && (
            <Field label="Banned until" value={new Date(user.bannedUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
          )}
        </div>
        {user.bio && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Field label="Bio" value={user.bio} />
          </div>
        )}
      </div>

      {/* Recent pings */}
      {activities.length > 0 && (
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Recent Pings <span className="text-gray-400 font-normal">(last {activities.length} of {pingCount})</span>
          </h2>
          <div className="divide-y divide-gray-50">
            {activities.map((a) => (
              <div key={a._id} className="py-2.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {a.type} · {new Date(a.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  a.status === 'live' ? 'bg-green-50 text-green-700 border border-green-200' :
                  a.status === 'ended' ? 'bg-gray-50 text-gray-500 border border-gray-200' :
                  'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
