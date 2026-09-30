'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, couponsApi, Coupon, CouponInput } from '@/lib/api';

type PlanOpt = { planId: string; tier: string; label: string };

const EMPTY: CouponInput = {
  code: '',
  description: '',
  discountType: 'percent',
  value: 100,
  appliesToTiers: [],
  appliesToPlanIds: [],
  firstTimeOnly: false,
  isFeatured: false,
  maxRedemptions: null,
  perUserLimit: 1,
  startsAt: null,
  expiresAt: null,
  isActive: true,
};

function toLocalInput(iso: string | null | undefined) {
  return iso ? new Date(iso).toISOString().slice(0, 16) : '';
}

function CouponModal({
  initial, plans, onSave, onClose, saving,
}: { initial?: Coupon; plans: PlanOpt[]; onSave: (f: CouponInput) => void; onClose: () => void; saving: boolean }) {
  const [form, setForm] = useState<CouponInput>(initial ? {
    code: initial.code,
    description: initial.description,
    discountType: initial.discountType,
    value: initial.discountType === 'flat' ? initial.value / 100 : initial.value,
    appliesToTiers: initial.appliesToTiers,
    appliesToPlanIds: initial.appliesToPlanIds,
    firstTimeOnly: initial.firstTimeOnly,
    isFeatured: initial.isFeatured,
    maxRedemptions: initial.maxRedemptions,
    perUserLimit: initial.perUserLimit,
    startsAt: toLocalInput(initial.startsAt),
    expiresAt: toLocalInput(initial.expiresAt),
    isActive: initial.isActive,
  } : EMPTY);
  const [err, setErr] = useState('');

  const set = <K extends keyof CouponInput>(k: K, v: CouponInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleIn = (k: 'appliesToTiers' | 'appliesToPlanIds', val: string) =>
    set(k, (form[k] ?? []).includes(val) ? (form[k] ?? []).filter((x) => x !== val) : [...(form[k] ?? []), val]);

  function submit() {
    setErr('');
    const code = (form.code ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,24}$/.test(code)) { setErr('Code must be 2–24 letters/numbers'); return; }
    const value = Number(form.value);
    if (!value || value < 1) { setErr('Enter a discount value'); return; }
    if (form.discountType === 'percent' && value > 100) { setErr('Percent cannot exceed 100'); return; }
    onSave({
      ...form,
      code,
      value: form.discountType === 'flat' ? Math.round(value * 100) : Math.round(value),
      maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
      perUserLimit: Number(form.perUserLimit) || 1,
      startsAt: form.startsAt ? new Date(form.startsAt as string).toISOString() : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt as string).toISOString() : null,
    });
  }

  const input = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none';
  const label = 'block text-xs font-semibold text-gray-500 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-y-auto max-h-[92vh]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">{initial ? 'Edit Coupon' : 'New Coupon'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <div className="space-y-4 px-6 py-5">
          {err && <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{err}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Code *</label>
              <input className={`${input} font-mono uppercase`} value={form.code ?? ''} onChange={(e) => set('code', e.target.value.toUpperCase())} maxLength={24} placeholder="WELCOME0" />
            </div>
            <div>
              <label className={label}>Description</label>
              <input className={input} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} maxLength={120} placeholder="1 month of Pro free" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Discount type</label>
              <select className={input} value={form.discountType} onChange={(e) => set('discountType', e.target.value as 'percent' | 'flat')}>
                <option value="percent">Percent off</option>
                <option value="flat">Flat ₹ off</option>
              </select>
            </div>
            <div>
              <label className={label}>{form.discountType === 'percent' ? 'Percent (1–100)' : 'Amount (₹)'}</label>
              <input type="number" className={input} value={form.value ?? ''} onChange={(e) => set('value', Number(e.target.value))} min={1} />
            </div>
          </div>
          <div>
            <label className={label}>Applies to tiers <span className="font-normal text-gray-400">(none = any)</span></label>
            <div className="flex gap-2">
              {['pro', 'premium'].map((t) => (
                <button key={t} type="button" onClick={() => toggleIn('appliesToTiers', t)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border ${(form.appliesToTiers ?? []).includes(t) ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={label}>Applies to specific plans <span className="font-normal text-gray-400">(none = any)</span></label>
            <div className="flex flex-wrap gap-2">
              {plans.map((p) => (
                <button key={p.planId} type="button" onClick={() => toggleIn('appliesToPlanIds', p.planId)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border ${(form.appliesToPlanIds ?? []).includes(p.planId) ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>Max redemptions</label>
              <input type="number" className={input} value={form.maxRedemptions ?? ''} onChange={(e) => set('maxRedemptions', e.target.value ? Number(e.target.value) : null)} placeholder="∞" min={1} />
            </div>
            <div>
              <label className={label}>Per user</label>
              <input type="number" className={input} value={form.perUserLimit ?? 1} onChange={(e) => set('perUserLimit', Number(e.target.value))} min={1} />
            </div>
            <div className="flex flex-col justify-end gap-2 pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" className="accent-violet-600" checked={!!form.firstTimeOnly} onChange={(e) => set('firstTimeOnly', e.target.checked)} /> First purchase only</label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Starts</label>
              <input type="datetime-local" className={input} value={(form.startsAt as string) ?? ''} onChange={(e) => set('startsAt', e.target.value)} />
            </div>
            <div>
              <label className={label}>Expires</label>
              <input type="datetime-local" className={input} value={(form.expiresAt as string) ?? ''} onChange={(e) => set('expiresAt', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" className="accent-violet-600" checked={!!form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} /> Featured in app (headline offer)</label>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" className="accent-violet-600" checked={form.isActive !== false} onChange={(e) => set('isActive', e.target.checked)} /> Active</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
            {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Coupon'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [plans, setPlans] = useState<PlanOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => { if (!isLoggedIn()) router.replace('/login'); }, [router]);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await couponsApi.list();
      setCoupons(r.coupons); setPlans(r.plans);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load coupons'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function save(form: CouponInput) {
    setSaving(true); setError('');
    try {
      if (modal === 'create') await couponsApi.create(form);
      else if (modal && typeof modal === 'object') await couponsApi.update(modal._id, form);
      setModal(null); fetchAll();
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  }

  async function toggle(c: Coupon, key: 'isActive' | 'isFeatured') {
    setError('');
    try { await couponsApi.update(c._id, { [key]: !c[key] }); fetchAll(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Update failed'); }
  }

  async function remove(id: string) {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    setDeleteConfirm(''); setError('');
    try { await couponsApi.remove(id); fetchAll(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Delete failed'); }
  }

  const discountText = (c: Coupon) => c.discountType === 'percent' ? `${c.value}% off` : `₹${(c.value / 100).toFixed(0)} off`;
  const appliesText = (c: Coupon) =>
    c.appliesToPlanIds.length ? c.appliesToPlanIds.map((id) => plans.find((p) => p.planId === id)?.label ?? id).join(', ')
    : c.appliesToTiers.length ? c.appliesToTiers.join(' / ') : 'Any plan';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="mt-1 text-sm text-gray-500">Discount codes users can apply on the plan screen. The featured one is shown in onboarding.</p>
        </div>
        <button onClick={() => setModal('create')} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">+ New Coupon</button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>}
      {deleteConfirm && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-amber-800">Delete this coupon permanently? Existing redemptions stay recorded.</p>
          <div className="flex gap-2">
            <button onClick={() => setDeleteConfirm('')} className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600">Cancel</button>
            <button onClick={() => remove(deleteConfirm)} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white">Yes, Delete</button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Code', 'Discount', 'Applies to', 'Rules', 'Used', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">Loading…</td></tr>
              ) : coupons.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No coupons yet.</td></tr>
              ) : coupons.map((c) => (
                <tr key={c._id} className="hover:bg-violet-50/40 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-mono font-semibold text-gray-900">{c.code}</div>
                    {c.description && <div className="text-xs text-gray-400 mt-0.5">{c.description}</div>}
                    {c.isFeatured && <span className="mt-1 inline-flex rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-[10px] font-semibold text-violet-700">FEATURED</span>}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-gray-900">{discountText(c)}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-600">{appliesText(c)}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-500">
                    {c.firstTimeOnly ? 'First purchase · ' : ''}{c.perUserLimit}/user
                    {c.expiresAt ? ` · until ${new Date(c.expiresAt).toLocaleDateString('en-IN')}` : ''}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-600">{c.redemptionCount}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''}</td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => toggle(c, 'isActive')} className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium border ${c.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">
                      <button onClick={() => toggle(c, 'isFeatured')} className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">{c.isFeatured ? 'Unfeature' : 'Feature'}</button>
                      <button onClick={() => setModal(c)} className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">Edit</button>
                      <button onClick={() => remove(c._id)} className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <CouponModal initial={modal === 'create' ? undefined : modal} plans={plans} onSave={save} onClose={() => setModal(null)} saving={saving} />
      )}
    </div>
  );
}
