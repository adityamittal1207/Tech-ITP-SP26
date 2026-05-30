import { useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { fetchAnalyticsDashboard } from '../api/analytics.js';
import { fetchBookings } from '../api/bookings.js';
import { fetchClasses }  from '../api/classes.js';
import { fetchMembers }  from '../api/members.js';

const CAT_COLORS = {
  yoga:     '#7EB8FF',
  pilates:  '#FF8FAB',
  hiit:     '#FF6B35',
  spin:     '#A78BFA',
  strength: '#F59E0B',
};

function buildTrend(bookings) {
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    return {
      date:  d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: 0,
    };
  });
  bookings.forEach(b => {
    const key = new Date(b.bookedAt).toISOString().slice(0, 10);
    const slot = days.find(d => d.date === key);
    if (slot) slot.count++;
  });
  return days;
}

function buildCategoryData(bookings, classMap) {
  const counts = {};
  bookings.forEach(b => {
    const cat = classMap[b.classId?._id ?? b.classId];
    if (cat) counts[cat] = (counts[cat] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}


const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1C1C1C',
    border: '1px solid #2A2A2A',
    borderRadius: 8,
    fontSize: 12,
    color: '#F0EDE8',
  },
  labelStyle: { color: '#888' },
};

export default function Dashboard() {
  const [members,  setMembers]  = useState([]);
  const [bookings, setBookings] = useState([]);
  const [classes,  setClasses]  = useState([]);
  const [atRisk,   setAtRisk]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([fetchMembers(), fetchBookings(), fetchClasses(), fetchAnalyticsDashboard()])
      .then(([m, b, c, analytics]) => {
        setMembers(m);
        setBookings(b);
        setClasses(c);
        setAtRisk(analytics.atRiskMembers ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const classMap   = useMemo(() => Object.fromEntries(classes.map(c => [c._id, c.category])), [classes]);
  const active     = members.filter(m => m.isActive).length;
  const attended   = bookings.filter(b => b.attended).length;
  const attRate    = bookings.length ? Math.round((attended / bookings.length) * 100) : 0;
  const trendData  = useMemo(() => buildTrend(bookings), [bookings]);
  const catData    = useMemo(() => buildCategoryData(bookings, classMap), [bookings, classMap]);
  const activeDays = new Set(classes.map(c => c.dayOfWeek)).size;

  if (loading) {
    return (
      <div className="page-enter">
        <div className="page-header"><h1 className="page-title">Dashboard</h1></div>
        <div className="state-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
          <div className="state-title">Loading data…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Studio performance overview</p>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Members</div>
          <div className="stat-value">{members.length}</div>
          <div className="stat-meta">{active} active · {members.length - active} inactive</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Members</div>
          <div className="stat-value">{active}</div>
          <div className="stat-meta">{Math.round((active / (members.length || 1)) * 100)}% of roster</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Classes / Week</div>
          <div className="stat-value">{classes.length}</div>
          <div className="stat-meta">across {activeDays} days</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Attendance Rate</div>
          <div className="stat-value">{attRate}%</div>
          <div className="stat-meta">{attended} attended of {bookings.length}</div>
        </div>
      </div>

      {/* ── Charts ────────────────────────────── */}
      <div className="charts-row col-2-1">
        <div className="chart-card">
          <div className="chart-heading">Bookings — Last 30 Days</div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#C8F135" stopOpacity={0.22}/>
                  <stop offset="95%" stopColor="#C8F135" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false}/>
              <XAxis
                dataKey="label"
                tick={{ fill: '#505050', fontSize: 10 }}
                tickFormatter={(v, i) => i % 6 === 0 ? v : ''}
                axisLine={false} tickLine={false}
              />
              <YAxis tick={{ fill: '#505050', fontSize: 10 }} axisLine={false} tickLine={false}/>
              <Tooltip {...TOOLTIP_STYLE} itemStyle={{ color: '#C8F135' }}/>
              <Area
                type="monotone" dataKey="count" name="Bookings"
                stroke="#C8F135" strokeWidth={2}
                fill="url(#areaGrad)" dot={false} activeDot={{ r: 4, fill: '#C8F135' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-heading">Category Popularity</div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={catData} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" horizontal={false}/>
              <XAxis type="number" tick={{ fill: '#505050', fontSize: 10 }} axisLine={false} tickLine={false}/>
              <YAxis
                type="category" dataKey="name" width={58}
                tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => v.charAt(0).toUpperCase() + v.slice(1)}
              />
              <Tooltip {...TOOLTIP_STYLE}/>
              <Bar dataKey="value" name="Bookings" radius={[0, 4, 4, 0]}>
                {catData.map(entry => (
                  <Cell key={entry.name} fill={CAT_COLORS[entry.name] || '#666'}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── At-risk ───────────────────────────── */}
      <div className="section">
        <div className="section-heading">
          At-Risk Members
          <span className={`section-heading-tag ${atRisk.length > 0 ? 'tag-danger' : 'tag-success'}`}>
            {atRisk.length > 0
              ? `${atRisk.length} need follow-up`
              : 'All members active'}
          </span>
        </div>

        {atRisk.length === 0 ? (
          <div className="state-wrap" style={{ padding: '24px', flexDirection: 'row', justifyContent: 'flex-start', gap: 10 }}>
            <svg viewBox="0 0 20 20" fill="none" stroke="var(--success)" strokeWidth="1.5" style={{ opacity: 0.8 }}>
              <path d="M4 10l4 4 8-8"/>
            </svg>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>All active members have recent booking activity.</span>
          </div>
        ) : (
          <div className="risk-list">
            {atRisk.map(m => (
              <div key={m._id} className="risk-row">
                <div>
                  <div className="risk-name">{m.name}</div>
                  <div className="risk-email">{m.email} &middot; {m.membershipType}</div>
                </div>
                <div className="risk-badge">No Recent Activity</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
