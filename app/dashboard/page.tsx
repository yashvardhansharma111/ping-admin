'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, overviewApi, OverviewLive, OverviewLast7d, OverviewQueues, OverviewDaily } from '@/lib/api';

function StatCard({ label, value, color, icon, prefix }: {
  label: string; value: number | string; color: string; icon: React.ReactNode; prefix?: string;
}) {
  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: color + '18' }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className}`} style={style} />;
}

const UsersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const PingIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" />
  </svg>
);
const ReportIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);
const RevenueIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

export default function DashboardPage() {
  const router = useRouter();
  const [live, setLive] = useState<OverviewLive | null>(null);
  const [last7d, setLast7d] = useState<OverviewLast7d | null>(null);
  const [queues, setQueues] = useState<OverviewQueues | null>(null);
  const [daily, setDaily] = useState<OverviewDaily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
    (async () => {
      try {
        const res = await overviewApi.overview();
        setLive(res.live);
        setLast7d(res.last7d);
        setQueues(res.queues);
        setDaily(res.daily ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const maxSignups = Math.max(...daily.map((d) => d.signups), 1);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="mt-1 text-sm text-gray-500">{today}</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Live stats */}
      {loading ? (
        <div className="grid grid-cols-2 gap-5 xl:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : live ? (
        <div className="grid grid-cols-2 gap-5 xl:grid-cols-4 mb-8">
          <StatCard label="Active Now" value={live.activeNow} color="#3B82F6" icon={<UsersIcon />} />
          <StatCard label="Live Pings" value={live.activePings} color="#7C3AED" icon={<PingIcon />} />
          <StatCard label="Pending Reports" value={queues?.pendingReports ?? 0} color="#EF4444" icon={<ReportIcon />} />
          <StatCard
            label="Today's Revenue"
            value={(live.todaysRevenueMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            prefix="₹"
            color="#22C55E"
            icon={<RevenueIcon />}
          />
        </div>
      ) : null}

      {/* Last 7d strip */}
      {!loading && last7d && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 mb-8">
          {[
            { label: 'New Signups', value: last7d.newSignups, color: 'text-blue-600' },
            { label: 'Pings Created', value: last7d.pingsCreated, color: 'text-violet-600' },
            { label: 'Ads Launched', value: last7d.adsLaunched, color: 'text-orange-500' },
            { label: 'Reports', value: last7d.reportsSubmitted, color: 'text-red-500' },
            { label: 'Bans Issued', value: last7d.bansIssued, color: 'text-gray-600' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white border border-gray-100 shadow-sm px-4 py-4">
              <p className="text-xs font-medium text-gray-400">{item.label} (7d)</p>
              <p className={`mt-1 text-2xl font-bold ${item.color}`}>{item.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart + Table */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Bar chart */}
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-5">New Signups — Last 7 Days</h2>
          {loading ? (
            <div className="flex items-end gap-1.5 h-40">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="flex-1" style={{ height: `${Math.random() * 80 + 20}%` }} />
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-end gap-1.5 h-40">
                {daily.map((d) => {
                  const pct = Math.max((d.signups / maxSignups) * 100, 2);
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                      <div
                        className="w-full rounded-t-sm bg-violet-500 group-hover:bg-violet-600 transition-colors cursor-default"
                        style={{ height: `${pct}%` }}
                        title={`${d.signups} signups on ${d.date}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-400">{daily[0]?.day}</span>
                <span className="text-xs text-gray-400">{daily[daily.length - 1]?.day}</span>
              </div>
            </>
          )}
        </div>

        {/* Daily table */}
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6 overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Daily Activity</h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-8" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2.5 text-left font-medium text-gray-500">Date</th>
                    <th className="pb-2.5 text-right font-medium text-gray-500">Signups</th>
                    <th className="pb-2.5 text-right font-medium text-gray-500">Pings</th>
                    <th className="pb-2.5 text-right font-medium text-gray-500">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {[...daily].reverse().map((d) => (
                    <tr key={d.date} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="py-2.5 text-gray-600">
                        {new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-2.5 text-right font-medium text-blue-600">+{d.signups}</td>
                      <td className="py-2.5 text-right font-medium text-violet-600">+{d.pings}</td>
                      <td className="py-2.5 text-right font-medium text-green-600">
                        ₹{(d.revenueMinor / 100).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
