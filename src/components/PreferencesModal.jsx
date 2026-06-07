const statusStyles = {
  can: { bg: 'var(--status-can-bg)', border: 'var(--status-can-border)', color: 'var(--status-can)', label: 'יכול' },
  prefer: { bg: 'var(--status-prefer-bg)', border: 'var(--status-prefer-border)', color: 'var(--status-prefer)', label: 'מעדיף' },
  avoid: { bg: 'var(--status-avoid-bg)', border: 'var(--status-avoid-border)', color: 'var(--status-avoid)', label: 'מעדיף שלא' },
  cannot: { bg: 'var(--status-cannot-bg)', border: 'var(--status-cannot-border)', color: 'var(--status-cannot)', label: 'לא יכול' },
};

const timeFrames = [
  { key: 'morning', label: 'בוקר' },
  { key: 'noon', label: 'צהריים' },
  { key: 'night', label: 'לילה' },
];

export default function PreferencesModal({ employee, days, preferences, onClose }) {
  const getStatus = (dateStr, tf) => {
    const pref = preferences.find(
      p => p.employee_id === employee.id && p.shift_date === dateStr && p.time_frame === tf
    );
    return pref ? pref.preference_status : null;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <h2 className="modal-title">העדפות משמרות — {employee.full_name}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {days.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>אין נתונים לשבוע זה.</p>
          ) : (
            <>
              <div className="pref-week-condensed">
                <div className="pref-week-row header-row">
                  <div className="pref-week-label-cell"></div>
                  {days.map(day => (
                    <div key={day.date} className="pref-week-day-header">
                      <span className="pref-week-day-name">{day.name}</span>
                      <span className="pref-week-date">{day.date.split('-').slice(1).join('/')}</span>
                    </div>
                  ))}
                </div>
                {timeFrames.map(tf => (
                  <div key={tf.key} className="pref-week-row">
                    <div className={`pref-week-label-cell ${tf.key}`}>{tf.label}</div>
                    {days.map(day => {
                      const status = getStatus(day.date, tf.key);
                      const style = status ? statusStyles[status] : null;
                      return (
                        <div
                          key={day.date}
                          className="pref-week-cell"
                          style={style ? {
                            background: style.bg,
                            borderColor: style.border,
                            color: style.color,
                          } : {}}
                        >
                          {style ? style.label : '—'}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="pref-legend">
                <div className="pref-legend-item" style={{ color: 'var(--status-cannot)' }}>● לא יכול</div>
                <div className="pref-legend-item" style={{ color: 'var(--status-avoid)' }}>● מעדיף שלא</div>
                <div className="pref-legend-item" style={{ color: 'var(--status-prefer)' }}>● מעדיף</div>
                <div className="pref-legend-item" style={{ color: 'var(--status-can)' }}>● יכול</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
