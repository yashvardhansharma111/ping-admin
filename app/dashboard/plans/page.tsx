'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, plansApi, SubscriptionPlan } from '@/lib/api';

function SkeletonRow() {
  return (
    <tr>
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 animate-pulse rounded bg-gray-100" style={{ width: i === 0 ? '140px' : '90px' }} />
        </td>
      ))}
    </tr>
  );
}

function EditPriceModal({
  plan,
  onSave,
  onClose,
  saving,
}: {
  plan: SubscriptionPlan;
  onSave: (amountRupees: number, label: string) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [rupees, setRupees] = useState(String(plan.amountMinor / 100));
  const [label, setLabel] = useState(plan.label);
  const [err, setErr] = useState('');

  function handleSave() {
    const v = parseFloat(rupees);
    if (isNaN(v) || v < 1 || !Number.isInteger(v * 100)) {
      setErr('Enter a valid whole-rupee amount (e.g. 199)');
      return;
    }
    if (!label.trim()) { setErr('Label cannot be empty'); return; }
    onSave(v, label.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Edit Plan</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Plan ID</p>
            <p className="text-sm font-mono text-gray-700">{plan.planId}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Display Label</label>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              value={label}
              onChange={(e) => { setLabel(e.target.value); setErr(''); }}
              maxLength={80}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Price (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">₹</span>
              <input
                type="number"
                min={1}
                step={1}
                className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                value={rupees}
                onChange={(e) => { setRupees(e.target.value); setErr(''); }}
              />
            </div>
            {err && <p className="mt-1 text-xs text-red-500">{err}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

const TIER_STYLE: Record<string, string> = {
  pro:     'bg-blue-50 text-blue-700 border border-blue-200',
  premium: 'bg-violet-50 text-violet-700 border border-violet-200',
};

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
  }, [router]);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await plansApi.list();
      setPlans(res.plans ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  async function handleSave(amountRupees: number, label: string) {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      await plansApi.update(editing.planId, {
        amountMinor: Math.round(amountRupees * 100),
        label,
      });
      setEditing(null);
      fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(plan: SubscriptionPlan) {
    setError('');
    try {
      await plansApi.update(plan.planId, { isActive: !plan.isActive });
      fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  const proPlanCount    = plans.filter((p) => p.tier === 'pro').length;
  const premPlanCount   = plans.filter((p) => p.tier === 'premium').length;
  const activePlanCount = plans.filter((p) => p.isActive).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="mt-1 text-sm text-gray-500">
          {plans.length} plans &middot; {activePlanCount} active &middot; {proPlanCount} Pro, {premPlanCount} Premium
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
                : plans.map((plan) => (
                  <tr key={plan.planId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-gray-900">{plan.label}</div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{plan.planId}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${TIER_STYLE[plan.tier] ?? 'bg-gray-100 text-gray-600'}`}>
                        {plan.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{plan.intervalLabel}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-gray-900">
                        ₹{(plan.amountMinor / 100).toLocaleString('en-IN')}
                      </span>
                      <span className="ml-1 text-xs text-gray-400">/{plan.intervalLabel}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => handleToggle(plan)}
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${plan.isActive ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'}`}
                      >
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setEditing(plan)}
                        className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Edit Price
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditPriceModal
          plan={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
