import { useEffect, useState } from 'react';
import { fetchClasses } from '../api/classes.js';

const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_ABBR  = ['MON','TUE','WED','THU','FRI','SAT','SUN'];

const CAT = {
  yoga:     { color: '#7EB8FF', label: 'Yoga' },
  pilates:  { color: '#FF8FAB', label: 'Pilates' },
  hiit:     { color: '#FF6B35', label: 'HIIT' },
  spin:     { color: '#A78BFA', label: 'Spin' },
  strength: { color: '#F59E0B', label: 'Strength' },
};

const ALL_CATS = Object.keys(CAT);

function fmt12(time) {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12    = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${suffix}`;
}

function todayName() {
  return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()];
}

export default function Schedule() {
  const [classes,    setClasses]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [catFilter,  setCatFilter]  = useState('all');
  const today = todayName();

  useEffect(() => {
    fetchClasses().then(setClasses).finally(() => setLoading(false));
  }, []);

  const visible = catFilter === 'all' ? classes : classes.filter(c => c.category === catFilter);

  const byDay = DAY_ORDER.map(day => ({
    day,
    cards: visible
      .filter(c => c.dayOfWeek === day)
      .sort((a, b) => a.time.localeCompare(b.time)),
  }));

  const totalVisible = visible.length;

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Weekly Schedule</h1>
          <p className="page-subtitle">
            {loading ? 'Loading…' : `${totalVisible} class${totalVisible !== 1 ? 'es' : ''} ${catFilter !== 'all' ? `· ${CAT[catFilter].label}` : 'across the week'}`}
          </p>
        </div>
      </div>

      <div className="schedule-body">
        {/* Filter bar */}
        <div className="filter-bar">
          <span className="filter-bar-label">Filter</span>
          <button
            className={`pill${catFilter === 'all' ? ' pill-active' : ''}`}
            onClick={() => setCatFilter('all')}
          >
            All
          </button>
          {ALL_CATS.map(cat => (
            <button
              key={cat}
              className={`pill${catFilter === cat ? ' pill-active' : ''}`}
              onClick={() => setCatFilter(prev => prev === cat ? 'all' : cat)}
              style={catFilter === cat ? { borderColor: CAT[cat].color, color: CAT[cat].color } : {}}
            >
              <span className="pill-dot" style={{ background: CAT[cat].color }}/>
              {CAT[cat].label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="state-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
            <div className="state-title">Loading schedule…</div>
          </div>
        ) : (
          <div className="week-grid">
            {byDay.map(({ day, cards }, i) => (
              <div key={day} className={`day-col${day === today ? ' is-today' : ''}`}>
                <div className="day-header">
                  <div className="day-abbr">{DAY_ABBR[i]}</div>
                  <div className="day-class-count">
                    {cards.length ? `${cards.length} class${cards.length !== 1 ? 'es' : ''}` : 'Rest day'}
                  </div>
                </div>

                {cards.length === 0 ? (
                  <div className="day-empty">—</div>
                ) : (
                  cards.map(cls => {
                    const cat = CAT[cls.category];
                    return (
                      <div
                        key={cls._id}
                        className="class-card"
                        style={{ borderLeftColor: cat?.color ?? 'var(--border)' }}
                      >
                        <div className="class-time">{fmt12(cls.time)}</div>
                        <div className="class-name">{cls.name}</div>
                        <div className="class-instructor">{cls.instructor}</div>
                        <div className="class-foot">
                          <span
                            className="cat-badge"
                            style={{ background: `${cat?.color}1A`, color: cat?.color }}
                          >
                            {cat?.label}
                          </span>
                          <span className="class-dur">{cls.durationMinutes}m</span>
                        </div>
                        <div className="cap-row">
                          <span>Capacity</span>
                          <span>{cls.capacity}</span>
                        </div>
                        <div className="cap-bar">
                          <div className="cap-fill" style={{ width: '0%' }}/>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
