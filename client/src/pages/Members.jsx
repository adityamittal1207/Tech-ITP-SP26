import { useEffect, useState } from 'react';
import { createMember, deleteMember, fetchMembers } from '../api/members.js';

const TYPES = ['basic', 'premium', 'unlimited'];
const STATUS_LABELS = { new: 'New', regular: 'Regular', 'at-risk': 'At-Risk', lapsed: 'Lapsed' };

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function AddModal({ onClose, onAdded }) {
  const [form, setForm]   = useState({ name: '', email: '', phone: '', membershipType: 'basic' });
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const m = await createMember(form);
      onAdded(m);
      onClose();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Add Member</div>
        {err && <div className="form-error">{err}</div>}
        <form onSubmit={submit}>
          <div className="form-field">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Jane Smith"/>
          </div>
          <div className="form-field">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="jane@example.com"/>
          </div>
          <div className="form-field">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="555-0100"/>
          </div>
          <div className="form-field">
            <label className="form-label">Membership</label>
            <select className="form-select" value={form.membershipType} onChange={e => set('membershipType', e.target.value)}>
              {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit"  className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add Member'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Members() {
  const [members,    setMembers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal,  setShowModal]  = useState(false);

  useEffect(() => {
    fetchMembers().then(setMembers).finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    try {
      await deleteMember(id);
      setMembers(prev => prev.filter(m => m._id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const matchQ = !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    const matchT = typeFilter === 'all' || m.membershipType === typeFilter;
    return matchQ && matchT;
  });

  const activeCount = members.filter(m => m.isActive).length;

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">
            {loading ? 'Loading…' : `${members.length} total · ${activeCount} active`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="7" y1="1" x2="7" y2="13"/>
            <line x1="1" y1="7" x2="13" y2="7"/>
          </svg>
          Add Member
        </button>
      </div>

      <div className="members-body">
        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-wrap">
            <svg className="search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6.5" cy="6.5" r="4.5"/>
              <line x1="10" y1="10" x2="14" y2="14"/>
            </svg>
            <input
              className="search-input"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="pill-group">
            {['all', ...TYPES].map(t => (
              <button
                key={t}
                className={`pill${typeFilter === t ? ' pill-active' : ''}`}
                onClick={() => setTypeFilter(t)}
              >
                {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <span className="count-tag">{filtered.length}</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="state-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
            <div className="state-title">Loading members…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="state-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <div className="state-title">No members found</div>
            <div className="state-sub">Try a different search or filter</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="members-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Phone</th>
                  <th>Membership</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th style={{ width: 40 }}/>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m._id}>
                    <td>
                      <div className="m-name">{m.name}</div>
                      <div className="m-email">{m.email}</div>
                    </td>
                    <td><span className="m-phone">{m.phone || '—'}</span></td>
                    <td>
                      <span className={`badge badge-${m.membershipType}`}>
                        {m.membershipType}
                      </span>
                    </td>
                    <td><span className="m-date">{fmtDate(m.joinDate)}</span></td>
                    <td>
                      <span className={`status ${m.status ?? 'regular'}`}>
                        {STATUS_LABELS[m.status] ?? m.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-icon"
                        title="Remove member"
                        onClick={() => handleDelete(m._id)}
                      >
                        <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                          <polyline points="2,3 12,3"/>
                          <path d="M5 3V2h4v1"/>
                          <path d="M3 3l.85 8.5h6.3L11 3"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <AddModal
          onClose={() => setShowModal(false)}
          onAdded={m => setMembers(prev => [m, ...prev])}
        />
      )}
    </div>
  );
}
