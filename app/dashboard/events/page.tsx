'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, eventsApi, AdminEvent } from '@/lib/api';

const EMPTY_FORM = {
  title: '',
  description: '',
  imageUrl: '',
  venueName: '',
  venueAddress: '',
  category: 'event' as 'event' | 'offer',
  startDate: '',
  endDate: '',
  tags: '',
  isActive: true,
};

type FormState = typeof EMPTY_FORM;

function SkeletonRow() {
  return (
    <tr>
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 animate-pulse rounded bg-gray-100" style={{ width: i === 0 ? '160px' : '100px' }} />
        </td>
      ))}
    </tr>
  );
}

function EventModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial?: AdminEvent;
  onSave: (f: FormState) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          title: initial.title,
          description: initial.description ?? '',
          imageUrl: initial.imageUrl ?? '',
          venueName: initial.venueName ?? '',
          venueAddress: initial.venueAddress ?? '',
          category: initial.category,
          startDate: initial.startDate ? initial.startDate.slice(0, 16) : '',
          endDate: initial.endDate ? initial.endDate.slice(0, 16) : '',
          tags: (initial.tags ?? []).join(', '),
          isActive: initial.isActive,
        }
      : EMPTY_FORM,
  );

  function set(k: keyof FormState, v: FormState[keyof FormState]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">{initial ? 'Edit Event' : 'New Event'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Title *</label>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              maxLength={80}
              placeholder="Event title"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
            <textarea
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none resize-none"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Short description"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                value={form.category}
                onChange={(e) => set('category', e.target.value as 'event' | 'offer')}
              >
                <option value="event">Event</option>
                <option value="offer">Offer</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-violet-600"
                  checked={form.isActive}
                  onChange={(e) => set('isActive', e.target.checked)}
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Start Date *</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">End Date *</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                value={form.endDate}
                onChange={(e) => set('endDate', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Venue Name</label>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              value={form.venueName}
              onChange={(e) => set('venueName', e.target.value)}
              maxLength={100}
              placeholder="e.g. Cubbon Park"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Venue Address</label>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              value={form.venueAddress}
              onChange={(e) => set('venueAddress', e.target.value)}
              maxLength={200}
              placeholder="Full address"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Image URL</label>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              value={form.imageUrl}
              onChange={(e) => set('imageUrl', e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Tags (comma-separated)</label>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="music, outdoor, free"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.title.trim() || !form.startDate || !form.endDate}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {initial ? 'Save Changes' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | AdminEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
  }, [router]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await eventsApi.list(page);
      setEvents(res.events ?? []);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  async function handleSave(form: FormState) {
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        venueName: form.venueName.trim() || undefined,
        venueAddress: form.venueAddress.trim() || undefined,
        category: form.category,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        isActive: form.isActive,
      };
      if (modal === 'create') {
        await eventsApi.create(payload);
      } else if (modal && typeof modal === 'object') {
        await eventsApi.update(modal._id, payload);
      }
      setModal(null);
      fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    setDeleteConfirm('');
    setError('');
    try {
      await eventsApi.remove(id);
      fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleToggle(ev: AdminEvent) {
    setError('');
    try {
      await eventsApi.update(ev._id, { isActive: !ev.isActive });
      fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="mt-1 text-sm text-gray-500">{total} total events</p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Event
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {deleteConfirm && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-amber-800">Delete this event permanently?</p>
          <div className="flex gap-2">
            <button onClick={() => setDeleteConfirm('')} className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={() => handleDelete(deleteConfirm)} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
              Yes, Delete
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Start</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">End</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                : events.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">No events yet — create one above.</td>
                  </tr>
                )
                : events.map((ev) => (
                  <tr key={ev._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-gray-900">{ev.title}</div>
                      {ev.venueName && <div className="text-xs text-gray-400 mt-0.5">{ev.venueName}</div>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ev.category === 'offer' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                        {ev.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">
                      {new Date(ev.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">
                      {new Date(ev.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => handleToggle(ev)}
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${ev.isActive ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'}`}
                      >
                        {ev.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setModal(ev)}
                          className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(ev._id)}
                          className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <span className="text-sm text-gray-500">Page {page} of {totalPages} &middot; {total} events</span>
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

      {modal && (
        <EventModal
          initial={modal === 'create' ? undefined : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
