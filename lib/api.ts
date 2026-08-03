const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adminToken');
}

export function setToken(token: string) {
  localStorage.setItem('adminToken', token);
}

export function clearToken() {
  localStorage.removeItem('adminToken');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? 'Request failed');
  return json as T;
}

export const authApi = {
  login: (email: string, password: string) =>
    req<{ ok: true; token: string; admin: Admin }>('POST', '/api/admin/v1/auth/login', { email, password }),
  me: () =>
    req<{ ok: true; admin: Admin }>('GET', '/api/admin/v1/auth/me'),
};

export const overviewApi = {
  overview: () =>
    req<{ ok: true; live: OverviewLive; last7d: OverviewLast7d; queues: OverviewQueues; daily: OverviewDaily[] }>(
      'GET', '/api/admin/v1/overview'
    ),
};

export const usersApi = {
  list: (page = 1, search = '', status = '') =>
    req<{ ok: true; users: AdminUser[]; total: number }>(
      'GET',
      `/api/admin/v1/users?page=${page}&search=${encodeURIComponent(search)}&status=${status}`
    ),
  ban: (id: string, type: 'temp' | 'perm', durationDays?: number, reason?: string) =>
    req('POST', `/api/admin/v1/users/${id}/ban`, { type, durationDays, reason }),
  unban: (id: string) =>
    req('POST', `/api/admin/v1/users/${id}/unban`),
};

export const reportsApi = {
  list: (page = 1, tab = 'all') =>
    req<{ ok: true; items: Report[]; total: number }>(
      'GET',
      `/api/admin/v1/reports?page=${page}&tab=${tab}`
    ),
  dismiss: (id: string) =>
    req('POST', `/api/admin/v1/reports/${id}/dismiss`),
  remove: (id: string, reason: string) =>
    req('POST', `/api/admin/v1/reports/${id}/remove`, { reason }),
};

export const paymentsApi = {
  list: (page = 1) =>
    req<{ ok: true; items: Payment[]; total: number; summary: { totalMinor: number; count: number } }>(
      'GET', `/api/admin/v1/payments?page=${page}`
    ),
  refund: (id: string, reason = 'Admin refund') =>
    req('POST', `/api/admin/v1/payments/${id}/refund`, { reason }),
};

export const verificationsApi = {
  list: (status = 'pending') =>
    req<{ ok: true; requests: VerificationRequest[]; total: number }>(
      'GET',
      `/api/admin/v1/verifications?status=${status}`
    ),
  approve: (id: string) =>
    req('POST', `/api/admin/v1/verifications/${id}/approve`),
  reject: (id: string, reason?: string) =>
    req('POST', `/api/admin/v1/verifications/${id}/reject`, { reason }),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Admin {
  _id: string;
  email: string;
  role: string;
  name?: string;
}

export interface OverviewLive {
  activeNow: number;
  activePings: number;
  activeAds: number;
  todaysRevenueMinor: number;
}

export interface OverviewLast7d {
  newSignups: number;
  pingsCreated: number;
  adsLaunched: number;
  reportsSubmitted: number;
  bansIssued: number;
}

export interface OverviewQueues {
  pendingReports: number;
  pendingAppeals: number;
}

export interface OverviewDaily {
  date: string;
  day: string;
  signups: number;
  pings: number;
  ads: number;
  revenueMinor: number;
}

export interface AdminUser {
  _id: string;
  displayName?: string;
  username?: string;
  phone: string;
  avatarUrl?: string;
  status: string;
  trustRate: number;
  createdAt: string;
  verificationStatus: string;
}

export interface Report {
  _id: string;
  reason: string;
  targetType: string;
  targetId: string;
  reporterId: string | { displayName?: string; username?: string; avatarUrl?: string };
  status: string;
  createdAt: string;
}

export interface Payment {
  _id: string;
  amountMinor: number;
  currency: string;
  status: string;
  gateway: string;
  userId: string | { displayName?: string; username?: string; phone?: string };
  planId?: string;
  purpose?: string;
  createdAt: string;
}

export interface VerificationRequest {
  _id: string;
  userId: {
    _id: string;
    displayName?: string;
    username?: string;
    avatarUrl?: string;
    phone: string;
  };
  selfieUrl: string;
  poseInstruction: string;
  status: string;
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
}
