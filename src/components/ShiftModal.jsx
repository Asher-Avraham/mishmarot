import { useState, useEffect } from 'react';

export default function ShiftModal({ shift, employees, preferences, onClose, onSave }) {
  const { date, dayName, timeFrame, jobType, assigned_employee_id, external_worker_name, override_cannot } = shift;

  const [selectedEmpId, setSelectedEmpId] = useState(assigned_employee_id || null);
  const [isOther, setIsOther] = useState(!!external_worker_name);
  const [otherName, setOtherName] = useState(external_worker_name || '');
  const [overrideConfirmed, setOverrideConfirmed] = useState(!!override_cannot);
  const [error, setError] = useState('');

  // Map database timeFrame to Hebrew name
  const timeFrameHebrew = {
    morning: 'בוקר',
    noon: 'צהריים',
    night: 'לילה'
  }[timeFrame] || timeFrame;

  // Map jobType to Hebrew name
  const jobTypeHebrew = {
    sag: 'שג',
    siyur: 'סיור'
  }[jobType] || jobType;

  // Filter preferences for this shift's date and time frame
  const getEmployeePreference = (empId) => {
    const pref = preferences.find(
      p => p.employee_id === empId && p.shift_date === date && p.time_frame === timeFrame
    );
    return pref ? pref.preference_status : 'can';
  };

  // Preference status names and styles
  const statusLabels = {
    can: 'יכול',
    prefer: 'מעדיף',
    avoid: 'מעדיף שלא',
    cannot: 'לא יכול'
  };

  const statusClasses = {
    can: 'status-can',
    prefer: 'status-prefer',
    avoid: 'status-avoid',
    cannot: 'status-cannot'
  };

  // Check if current selection requires override
  const selectedEmpPref = selectedEmpId ? getEmployeePreference(selectedEmpId) : 'can';
  const showOverrideWarning = !isOther && selectedEmpId && selectedEmpPref === 'cannot';

  // Automatically reset override confirmation if selection changes
  useEffect(() => {
    if (selectedEmpId !== assigned_employee_id) {
      setOverrideConfirmed(false);
    } else {
      setOverrideConfirmed(!!override_cannot);
    }
  }, [selectedEmpId, assigned_employee_id, override_cannot]);

  const handleSelectEmployee = (empId) => {
    setIsOther(false);
    setSelectedEmpId(empId);
    setError('');
  };

  const handleSelectOther = () => {
    setSelectedEmpId(null);
    setIsOther(true);
    setError('');
  };

  const handleClearShift = () => {
    setSelectedEmpId(null);
    setIsOther(false);
    setOtherName('');
    setOverrideConfirmed(false);
    setError('');
  };

  const handleSave = () => {
    if (isOther && !otherName.trim()) {
      setError('אנא הזן את שם העובד החיצוני.');
      return;
    }

    if (showOverrideWarning && !overrideConfirmed) {
      setError('יש לאשר את תיבת השיבוץ החריג עבור עובד שסימן "לא יכול".');
      return;
    }

    // Return the assignment state
    onSave({
      shift_date: date,
      time_frame: timeFrame,
      job_type: jobType,
      assigned_employee_id: isOther ? null : selectedEmpId,
      external_worker_name: isOther ? otherName.trim() : null,
      override_cannot: showOverrideWarning && overrideConfirmed ? 1 : 0
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            שיוך משמרת: יום {dayName} — {timeFrameHebrew} — {jobTypeHebrew}
          </h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="form-error" style={{ marginBottom: '16px' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginBottom: '14px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            בחר עובד לשיבוץ מתוך הרשימה:
          </div>

          <div className="assignee-list">
            {employees.map(emp => {
              const pref = getEmployeePreference(emp.id);
              const isSelected = !isOther && selectedEmpId === emp.id;
              
              return (
                <div
                  key={emp.id}
                  className={`assignee-option ${statusClasses[pref]} ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectEmployee(emp.id)}
                >
                  <div className="assignee-option-name">
                    <span className="employee-avatar">
                      {emp.full_name.charAt(0)}
                    </span>
                    <span>{emp.full_name}</span>
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>
                      ({emp.shift_count || 0} משמרות השבוע)
                    </span>
                  </div>
                  <div className="assignee-option-status">
                    {statusLabels[pref]}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Other / External Worker option */}
          <div className="other-option-container">
            <div className="other-option-header" onClick={handleSelectOther}>
              <input
                type="radio"
                name="assignee-source"
                checked={isOther}
                onChange={handleSelectOther}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
              />
              <span className="form-label" style={{ cursor: 'pointer' }}>עובד חיצוני (אחר)</span>
            </div>
            
            {isOther && (
              <input
                type="text"
                className="form-input other-option-input"
                placeholder="הזן שם מלא של העובד החיצוני..."
                value={otherName}
                onChange={(e) => {
                  setOtherName(e.target.value);
                  setError('');
                }}
              />
            )}
          </div>

          {/* Override Checkbox Alert */}
          {showOverrideWarning && (
            <div className="override-warning-container">
              <div className="override-warning-text">
                העובד שנבחר סימן כי הוא <strong>לא יכול</strong> לעבוד במשמרת זו ({timeFrameHebrew}).
              </div>
              <label className="override-checkbox-label">
                <input
                  type="checkbox"
                  checked={overrideConfirmed}
                  onChange={(e) => {
                    setOverrideConfirmed(e.target.checked);
                    if (e.target.checked) setError('');
                  }}
                />
                <span>האם אתה רוצה לשבץ אותו על אף שכתב שלא יכול באותה משמרת?</span>
              </label>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClearShift} style={{ marginLeft: 'auto' }}>
            פנה משמרת
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            ביטול
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            שמור שיבוץ
          </button>
        </div>
      </div>
    </div>
  );
}
