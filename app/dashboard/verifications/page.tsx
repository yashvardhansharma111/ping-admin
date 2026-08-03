'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, verificationsApi, VerificationRequest } from '@/lib/api';

const STATUS_TABS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const STATUS_BADGE: Record<string, string> = {
  pending:  'bg-yellow-50 text-yellow-700 border border-yellow-200',
  approved: 'bg-green-50 text-green-700 border border-green-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
};

function UserAvatar({ url, name }: { url?: string; name: string }) {
  const initials = name.slice(0, 2).toUpperCase();
  if (url) return <img src={url} alt={name} className="h-10 w-10 rounded-full object-cover border border-gray-100" />;
  return (
    <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-semibold">
      {initials}
    </div>
  );
}

function RejectModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3">
      <p className="mb-2 text-xs font-medium text-red-700">Reason for rejection (optional):</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="e.g. Pose not clear, face not visible…"
        className="w-full rounded-md border border-red-200 bg-white px-2.5 py-2 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-red-400 resize-none"
      />
      <div className="mt-2 flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(reason)}
          disabled={loading}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? 'Rejecting…' : 'Reject'}
        </button>
      </div>
    </div>
  );
}

function VerificationCard({
  req,
  onApprove,
  onReject,
}: {
  req: VerificationRequest;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
}) {
  const [showReject, setShowReject] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const user = req.userId;
  const displayName = user.displayName || user.username || 'Unknown';

  async function handleApprove() {
    setApproveLoading(true);
    await onApprove(req._id);
    setApproveLoading(false);
  }

  async function handleReject(reason: string) {
    setRejectLoading(true);
    await onReject(req._id, reason);
    setRejectLoading(false);
    setShowReject(false);
  }

  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      {/* User info header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <UserAvatar url={user.avatarUrl} name={displayName} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">{displayName}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {user.username ? `@${user.username}` : ''}{user.username && user.phone ? ' · ' : ''}{user.phone}
          </p>
        </div>
        <span className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[req.status]}`}>
          {req.status}
        </span>
      </div>

      {/* Pose instruction */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-0.5">Pose instruction given</p>
        <p className="text-sm font-medium text-gray-800">{req.poseInstruction}</p>
      </div>

      {/* Photos */}
      <div className="grid grid-cols-2 gap-3 p-5">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-2 text-center">Profile Photo</p>
          <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
            {user.avatarUrl && !imgErrors['avatar'] ? (
              <img
                src={user.avatarUrl}
                alt="Profile"
                className="h-full w-full object-cover"
                onError={() => setImgErrors((p) => ({ ...p, avatar: true }))}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">
                No photo
              </div>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400 mb-2 text-center">Verification Selfie</p>
          <a href={req.selfieUrl} target="_blank" rel="noopener noreferrer" className="block">
            <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-100 relative group cursor-pointer">
              {req.selfieUrl && !imgErrors['selfie'] ? (
                <>
                  <img
                    src={req.selfieUrl}
                    alt="Selfie"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={() => setImgErrors((p) => ({ ...p, selfie: true }))}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black/60 px-2 py-1 rounded">Open ↗</span>
                  </div>
                </>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-gray-400 text-sm p-2 text-center">
                  <span>Image blocked</span>
                  <span className="text-xs text-violet-500 underline">Click to open</span>
                </div>
              )}
            </div>
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-5">
        <p className="text-xs text-gray-400 mb-3">
          Submitted {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          {req.reviewedAt && ` · Reviewed ${new Date(req.reviewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
        </p>

        {req.rejectionReason && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
            <span className="font-medium">Rejection reason: </span>{req.rejectionReason}
          </div>
        )}

        {req.status === 'pending' && (
          <div>
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={approveLoading || rejectLoading}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
              >
                {approveLoading ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Approve
                  </>
                )}
              </button>
              <button
                onClick={() => setShowReject((v) => !v)}
                disabled={approveLoading || rejectLoading}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Reject
              </button>
            </div>
            {showReject && (
              <RejectModal
                onConfirm={handleReject}
                onCancel={() => setShowReject(false)}
                loading={rejectLoading}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden animate-pulse">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="h-10 w-10 rounded-full bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-gray-100" />
          <div className="h-3 w-24 rounded bg-gray-100" />
        </div>
      </div>
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
        <div className="h-3 w-40 rounded bg-gray-100" />
      </div>
      <div className="grid grid-cols-2 gap-3 p-5">
        <div className="aspect-square rounded-xl bg-gray-100" />
        <div className="aspect-square rounded-xl bg-gray-100" />
      </div>
      <div className="px-5 pb-5">
        <div className="h-3 w-48 rounded bg-gray-100 mb-3" />
        <div className="flex gap-2">
          <div className="flex-1 h-10 rounded-lg bg-gray-100" />
          <div className="flex-1 h-10 rounded-lg bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

export default function VerificationsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
  }, [router]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await verificationsApi.list(status);
      console.log('[verifications] total:', res.total, 'requests:', res.requests?.length);
      res.requests?.forEach((r: any) => {
        console.log(`  _id=${r._id} selfieUrl=${r.selfieUrl} userId=`, r.userId);
      });
      setRequests(res.requests ?? []);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verifications');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  async function handleApprove(id: string) {
    try {
      await verificationsApi.approve(id);
      fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed');
    }
  }

  async function handleReject(id: string, reason: string) {
    try {
      await verificationsApi.reject(id, reason || undefined);
      fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed');
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Verifications</h1>
        <p className="mt-1 text-sm text-gray-500">{total.toLocaleString()} {status} requests</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Status tabs */}
      <div className="mb-6 flex gap-1.5">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={[
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              status === tab.value
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm py-20">
          <div className="rounded-2xl bg-gray-50 p-5 mb-4">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">No {status} verifications</p>
          <p className="text-sm text-gray-400 mt-1">All caught up!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {requests.map((req) => (
            <VerificationCard
              key={req._id}
              req={req}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
