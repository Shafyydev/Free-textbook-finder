import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { PageFade } from '../components/ui.jsx';

export default function RequestBook() {
  const [sp] = useSearchParams();
  const [form, setForm] = useState({ requested_title: sp.get('title') || '', notes: '', contact: '' });
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setStatus({ type: '', msg: '' });
    if (!form.requested_title.trim()) return setStatus({ type: 'error', msg: 'Please enter a title.' });
    setBusy(true);
    try {
      await api.createRequest(form);
      setStatus({ type: 'success', msg: 'Request submitted. Thank you.' });
      setForm({ requested_title: '', notes: '', contact: '' });
    } catch (e) { setStatus({ type: 'error', msg: e.message }); }
    finally { setBusy(false); }
  }

  return (
    <PageFade>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <h1>Request a textbook</h1>
        <p className="muted" style={{ textAlign: 'center' }}>Request a title you need. We only add books from legal, official open sources.</p>
        <form className="card" onSubmit={submit}>
          {status.msg && <div className={status.type === 'error' ? 'error' : 'success'}>{status.msg}</div>}
          <div style={{ marginBottom: '.75rem' }}>
            <label>Requested title *</label>
            <input value={form.requested_title} onChange={e => setForm({ ...form, requested_title: e.target.value })} maxLength={300} required />
          </div>
          <div style={{ marginBottom: '.75rem' }}>
            <label>Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} maxLength={2000} placeholder="Edition, author, course, or other details" />
          </div>
          <div style={{ marginBottom: '.75rem' }}>
            <label>Contact (optional)</label>
            <input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} maxLength={200} placeholder="Email or other contact (optional)" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <button disabled={busy} type="submit">{busy ? 'Submitting...' : 'Submit request'}</button>
          </div>
        </form>
      </div>
    </PageFade>
  );
}
