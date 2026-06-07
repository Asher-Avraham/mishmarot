import { useState, useEffect } from 'react';

export default function EmployeeDashboard({ token }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [week, setWeek] = useState(null);
  const [days, setDays] = useState([]);
  
  // Local state for preferences map: { 'YYYY-MM-DD_timeframe': status }
  const [prefMap, setPrefMap] = useState({});
  const [saving, setSaving] = useState(false);

  // Time frames and labels
  const timeFrames = [
    { key: 'morning', label: 'בוקר' },
    { key: 'noon', label: 'צהריים' },
    { key: 'night', label: 'לילה' }
  ];

  // Preference status choices in Hebrew
  const statusChoices = [
    { key: 'can', label: 'יכול', className: 'can' },
    { key: 'prefer', label: 'מעדיף', className: 'prefer' },
    { key: 'avoid', label: 'מעדיף שלא', className: 'avoid' },
    { key: 'cannot', label: 'לא יכול', className: 'cannot' }
  ];

  useEffect(() => {
    const fetchUpcomingWeekAndPrefs = async () => {
      try {
        // 1. Get week and days
        const weekResponse = await fetch('/api/weeks/upcoming', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const weekData = await weekResponse.json();
        if (!weekResponse.ok) {
          throw new Error(weekData.error || 'שגיאה בטעינת נתוני שבוע עבודה.');
        }
        setWeek(weekData.week);
        setDays(weekData.days);

        // 2. Get existing preferences
        const prefResponse = await fetch('/api/employee/preferences/upcoming', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const prefData = await prefResponse.json();
        if (!prefResponse.ok) {
          throw new Error(prefData.error || 'שגיאה בטעינת העדפות עובד.');
        }

        // Convert preferences list to map
        const newMap = {};
        prefData.forEach(p => {
          newMap[`${p.shift_date}_${p.time_frame}`] = p.preference_status;
        });

        // Initialize missing combinations to 'can'
        weekData.days.forEach(day => {
          timeFrames.forEach(tf => {
            const key = `${day.date}_${tf.key}`;
            if (!newMap[key]) {
              newMap[key] = 'can'; // default preference
            }
          });
        });

        setPrefMap(newMap);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingWeekAndPrefs();
  }, [token]);

  // Handle choice change
  const handleStatusChange = (date, tfKey, statusKey) => {
    setPrefMap(prev => ({
      ...prev,
      [`${date}_${tfKey}`]: statusKey
    }));
    setSuccess('');
    setError('');
  };

  // Submit preferences to backend
  const handleSavePreferences = async () => {
    setSaving(true);
    setSuccess('');
    setError('');

    try {
      // Convert map back to list
      const preferences = Object.keys(prefMap).map(key => {
        const [shift_date, time_frame] = key.split('_');
        return {
          shift_date,
          time_frame,
          preference_status: prefMap[key]
        };
      });

      const response = await fetch('/api/employee/preferences/upcoming', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ preferences })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בשמירת ההעדפות.');
      }

      setSuccess('העדפותיך לשבוע הבא נשמרו והתעדכנו בהצלחה במערכת!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Format date DD/MM
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-secondary)' }}>
        <h2>טוען טופס העדפות שבועי...</h2>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <div className="page-header" style={{ alignItems: 'center', marginBottom: '24px' }}>
        <div className="page-title-area">
          <h2 className="page-title">הגשת העדפות לשבוע הבא</h2>
          {week && (
            <p className="page-subtitle">
              הזן את מידת זמינותך לכל אחת ממשמרות השבוע הבא: {formatDateDisplay(week.week_start_date)} עד {formatDateDisplay(week.week_end_date)}
            </p>
          )}
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSavePreferences}
          disabled={saving}
          style={{ minWidth: '150px' }}
        >
          {saving ? 'שומר העדפות...' : 'שמור העדפות'}
        </button>
      </div>

      {error && (
        <div className="form-error" style={{ marginBottom: '20px' }}>
          <span>⚠️ {error}</span>
        </div>
      )}

      {success && (
        <div className="form-success" style={{ marginBottom: '20px' }}>
          <span>✅ {success}</span>
        </div>
      )}

      {/* Grid Headers for desktop */}
      <div className="pref-grid-header">
        <div>יום ותאריך</div>
        {timeFrames.map(tf => (
          <div key={tf.key}>{tf.label}</div>
        ))}
      </div>

      {/* Days Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '32px' }}>
        {days.map(day => (
          <div key={day.date} className="pref-row">
            <div className="pref-day-info">
              <span className="pref-day-name">יום {day.name}</span>
              <span className="pref-day-date">{formatDateDisplay(day.date)}</span>
            </div>

            {/* Morning, Noon, Night Segmented selectors */}
            {timeFrames.map(tf => {
              const currentStatus = prefMap[`${day.date}_${tf.key}`] || 'can';
              return (
                <div key={tf.key} className="form-group" style={{ gap: '4px' }}>
                  {/* Small helper text visible on mobile screen only */}
                  <span className="form-label" style={{ display: 'none', fontSize: '12px', color: 'var(--text-secondary)' }} id={`lbl-${day.date}-${tf.key}`}>
                    משמרת {tf.label}:
                  </span>
                  
                  <div className="segmented-selector">
                    {statusChoices.map(choice => (
                      <div
                        key={choice.key}
                        className={`selector-option ${currentStatus === choice.key ? `selected ${choice.className}` : ''}`}
                        onClick={() => handleStatusChange(day.date, tf.key, choice.key)}
                      >
                        {choice.label}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
        <button
          className="btn btn-primary"
          onClick={handleSavePreferences}
          disabled={saving}
          style={{ width: '100%', maxWidth: '300px' }}
        >
          {saving ? 'שומר העדפות...' : 'שמור העדפות שבועיות'}
        </button>
      </div>
    </div>
  );
}
