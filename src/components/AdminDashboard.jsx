import { useState, useEffect } from 'react';
import ShiftModal from './ShiftModal';
import PreferencesModal from './PreferencesModal';

export default function AdminDashboard({ token }) {
  // Scheduling state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [week, setWeek] = useState(null);
  const [days, setDays] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // Load schedule board data
  const loadScheduleData = async () => {
    try {
      const response = await fetch('/api/admin/schedule/upcoming', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בטעינת לוח השיבוצים.');
      }
      setWeek(data.week);
      setDays(data.days);
      setEmployees(data.employees);
      setPreferences(data.preferences);
      setAssignments(data.assignments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScheduleData();
  }, [token]);

  // Handle shift assignment save (optimistic)
  const handleAssignSave = async (payload) => {
    const prevAssignments = assignments;
    const prevEmployees = employees;

    const isClearing = !payload.assigned_employee_id && !payload.external_worker_name;

    // Build optimistic assignment
    const optimistic = isClearing ? null : {
      id: `opt-${Date.now()}`,
      shift_date: payload.shift_date,
      time_frame: payload.time_frame,
      job_type: payload.job_type,
      assigned_employee_id: payload.assigned_employee_id,
      external_worker_name: payload.external_worker_name,
      override_cannot: !!payload.override_cannot,
    };

    // Optimistically update assignments (replace if same slot exists)
    setAssignments(prev => {
      const filtered = prev.filter(
        a => !(a.shift_date === payload.shift_date && a.time_frame === payload.time_frame && a.job_type === payload.job_type)
      );
      return optimistic ? [...filtered, optimistic] : filtered;
    });

    // Optimistically update shift counts
    setEmployees(prev => {
      const updated = [...prev];
      const oldAssign = prevAssignments.find(
        a => a.shift_date === payload.shift_date && a.time_frame === payload.time_frame && a.job_type === payload.job_type
      );
      if (oldAssign?.assigned_employee_id) {
        const i = updated.findIndex(e => e.id === oldAssign.assigned_employee_id);
        if (i !== -1) updated[i] = { ...updated[i], shift_count: Math.max(0, (updated[i].shift_count || 0) - 1) };
      }
      if (payload.assigned_employee_id) {
        const i = updated.findIndex(e => e.id === payload.assigned_employee_id);
        if (i !== -1) updated[i] = { ...updated[i], shift_count: (updated[i].shift_count || 0) + 1 };
      }
      return updated;
    });

    // Close modal immediately
    setSelectedShift(null);

    try {
      const response = await fetch('/api/admin/shifts/assign', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'REQUIRES_OVERRIDE') {
          setAssignments(prevAssignments);
          setEmployees(prevEmployees);
          alert('נדרש אישור חריג לשיבוץ עובד זה.');
          return;
        }
        throw new Error(data.error || 'שגיאה בשיבוץ העובד.');
      }

      // Refresh in background for accurate server data
      loadScheduleData();
    } catch (err) {
      setAssignments(prevAssignments);
      setEmployees(prevEmployees);
      alert(err.message);
    }
  };

  const handleDeleteAll = async () => {
    try {
      const response = await fetch('/api/admin/shifts/all', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'שגיאה במחיקת כל השיבוצים.');
      }

      setShowDeleteAllConfirm(false);
      loadScheduleData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Find assignment helper
  const getAssignment = (dateStr, tf, job) => {
    return assignments.find(
      a => a.shift_date === dateStr && a.time_frame === tf && a.job_type === job
    );
  };

  // Find assignee display name
  const getAssigneeDisplayName = (assignment) => {
    if (!assignment) return null;
    if (assignment.external_worker_name) {
      return { name: assignment.external_worker_name, isExternal: true };
    }
    const emp = employees.find(e => e.id === assignment.assigned_employee_id);
    return { 
      name: emp ? emp.full_name : 'עובד לא קיים', 
      isExternal: false,
      overrideCannot: !!assignment.override_cannot
    };
  };

  // Open modal with current shift state
  const handleShiftClick = (day, timeFrame, jobType) => {
    const existing = getAssignment(day.date, timeFrame, jobType);
    setSelectedShift({
      date: day.date,
      dayName: day.name,
      timeFrame,
      jobType,
      assigned_employee_id: existing ? existing.assigned_employee_id : null,
      external_worker_name: existing ? existing.external_worker_name : null,
      override_cannot: existing ? existing.override_cannot : false
    });
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
        <h2>טוען לוח שיבוצים שבועי...</h2>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {error && (
        <div className="form-error" style={{ margin: '20px' }}>
          <span>{error}</span>
        </div>
      )}

      {/* Top Counters Card */}
      <div className="employees-counters-card">
        <h3 className="card-title">עומס עבודה שבועי (מספר משמרות לכל עובד)</h3>
        <div className="employee-pills">
          {employees.map(emp => (
            <div key={emp.id} className="employee-pill" onClick={() => setSelectedEmployee(emp)}>
              <span className="employee-avatar">{emp.full_name.charAt(0)}</span>
              <span>{emp.full_name}</span>
              <span className={`employee-count ${emp.shift_count > 0 ? 'active-shifts' : ''}`}>
                {emp.shift_count || 0}
              </span>
            </div>
          ))}
          {employees.length === 0 && (
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>אין עובדים פעילים במערכת.</span>
          )}
        </div>
      </div>

      {/* Main Schedule Board */}
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div className="page-title-area">
          <h2 className="page-title">לוח שיבוץ משמרות</h2>
          {week && (
            <p className="page-subtitle">
              שבוע עבודה: יום ראשון {formatDateDisplay(week.week_start_date)} עד יום שבת {formatDateDisplay(week.week_end_date)}
            </p>
          )}
        </div>
      </div>

      <div className="schedule-container">
        <div className="schedule-grid">
          {/* Shift Type Labels Column (Right side in RTL) */}
          <div className="shift-type-column">
            {[
              { tf: 'morning', job: 'sag', label: 'בוקר שג' },
              { tf: 'morning', job: 'siyur', label: 'בוקר סיור' },
              { tf: 'noon', job: 'sag', label: 'צהריים שג' },
              { tf: 'noon', job: 'siyur', label: 'צהריים סיור' },
              { tf: 'night', job: 'sag', label: 'לילה שג' },
              { tf: 'night', job: 'siyur', label: 'לילה סיור' }
            ].map((type, idx) => (
              <div key={idx} className={`shift-type-label ${type.tf}`}>
                <span>{type.label.split(' ')[1]}</span>
                <span className="time">{type.label.split(' ')[0]}</span>
              </div>
            ))}
          </div>

          {days.map(day => (
            <div key={day.date} className="day-column">
              <div className="day-header">
                <span className="day-name">יום {day.name}</span>
                <span className="day-date">{formatDateDisplay(day.date)}</span>
              </div>

              {[
                { tf: 'morning', job: 'sag' },
                { tf: 'morning', job: 'siyur' },
                { tf: 'noon', job: 'sag' },
                { tf: 'noon', job: 'siyur' },
                { tf: 'night', job: 'sag' },
                { tf: 'night', job: 'siyur' }
              ].map((slot, idx) => {
                const assign = getAssignment(day.date, slot.tf, slot.job);
                const display = getAssigneeDisplayName(assign);
                return (
                  <div
                    key={idx}
                    className={`shift-card ${slot.tf}`}
                    onClick={() => handleShiftClick(day, slot.tf, slot.job)}
                  >
                    {display ? (
                      <div className={`shift-assignee assigned ${display.isExternal ? 'external' : ''}`} style={{ width: '100%', margin: 0 }}>
                        {display.name}
                        {display.overrideCannot && (
                          <div className="shift-override-badge" title="שיבוץ חריג!">⚠️</div>
                        )}
                      </div>
                    ) : (
                      <div className="shift-assignee" style={{ border: 'none', opacity: 0.4 }}>— פנוי —</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="schedule-footer">
          <button 
            className="btn btn-danger" 
            onClick={() => setShowDeleteAllConfirm(true)}
            style={{ padding: '10px 24px' }}
          >
            מחק הכל
          </button>
        </div>
      </div>

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-header" style={{ justifyContent: 'center' }}>
              <h3 className="modal-title">מחיקת כל השיבוצים</h3>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)' }}>האם אתה באמת רוצה למחוק הכל?</p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setShowDeleteAllConfirm(false)}>ביטול</button>
              <button className="btn btn-danger" onClick={handleDeleteAll}>מחק הכל</button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {selectedEmployee && (
        <PreferencesModal
          employee={selectedEmployee}
          days={days}
          preferences={preferences}
          onClose={() => setSelectedEmployee(null)}
        />
      )}

      {/* Shift Assignment Modal */}
      {selectedShift && (
        <ShiftModal
          shift={selectedShift}
          employees={employees}
          preferences={preferences}
          onClose={() => setSelectedShift(null)}
          onSave={handleAssignSave}
        />
      )}
    </div>
  );
}
