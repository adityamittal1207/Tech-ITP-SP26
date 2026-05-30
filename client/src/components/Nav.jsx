const ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="6" height="6" rx="1.5"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5"/>
      </svg>
    ),
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="2.5" width="13" height="12" rx="1.75"/>
        <line x1="1.5" y1="6.5" x2="14.5" y2="6.5"/>
        <line x1="5" y1="1" x2="5" y2="4"/>
        <line x1="11" y1="1" x2="11" y2="4"/>
      </svg>
    ),
  },
  {
    id: 'members',
    label: 'Members',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg">
        <circle cx="6.5" cy="5" r="2.5"/>
        <path d="M1 14c0-3.038 2.462-5.5 5.5-5.5S12 10.962 12 14"/>
        <path d="M11 7a2.5 2.5 0 000-5M14 14c0-2.485-1.343-4.5-3-4.9"/>
      </svg>
    ),
  },
];

export default function Nav({ page, setPage }) {
  return (
    <nav className="nav">
      <div className="nav-brand">
        <div className="nav-wordmark">
          LUM<span>N</span>US
        </div>
        <div className="nav-sub">Studio Manager</div>
      </div>

      <div className="nav-links">
        <div className="nav-section-label">Workspace</div>
        {ITEMS.map(({ id, label, icon }) => (
          <button
            key={id}
            className={`nav-link${page === id ? ' active' : ''}`}
            onClick={() => setPage(id)}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <div className="nav-footer">
        <div className="nav-status">
          <div className="nav-status-dot" />
          Connected
        </div>
      </div>
    </nav>
  );
}
