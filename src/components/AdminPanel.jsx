import { useState, useEffect } from 'react';

export default function AdminPanel({ token }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states: New Employee
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpUser, setNewEmpUser] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpPass, setNewEmpPass] = useState('');
  const [newEmpError, setNewEmpError] = useState('');
  const [newEmpSuccess, setNewEmpSuccess] = useState('');
  const [newEmpLoading, setNewEmpLoading] = useState(false);

  // Form states: Reset Password
  const [resetEmpId, setResetEmpId] = useState('');
  const [resetEmpPass, setResetEmpPass] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // State for Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name } or null

  // Fetch employees list
  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/admin/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בטעינת רשימת העובדים.');
      }
      setEmployees(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [token]);

  // Handle adding new employee
  const handleAddEmployeeSubmit = async (e) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpUser.trim() || !newEmpPass.trim()) {
      setNewEmpError('נא למלא את כל שדות החובה (שם, שם משתמש וסיסמה).');
      return;
    }

    setNewEmpError('');
    setNewEmpSuccess('');
    setNewEmpLoading(true);

    try {
      const response = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: newEmpName,
          username: newEmpUser,
          password: newEmpPass,
          phone: newEmpPhone
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'שגיאה ברישום עובד חדש.');
      }

      setNewEmpSuccess('העובד נרשם בהצלחה במערכת!');
      setNewEmpName('');
      setNewEmpUser('');
      setNewEmpPhone('');
      setNewEmpPass('');
      // Reload list
      fetchEmployees();
    } catch (err) {
      setNewEmpError(err.message);
    } finally {
      setNewEmpLoading(false);
    }
  };

  // Handle resetting password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetEmpId || !resetEmpPass.trim()) {
      setResetError('אנא בחר עובד והזן סיסמה חדשה.');
      return;
    }

    setResetError('');
    setResetSuccess('');
    setResetLoading(true);

    try {
      const response = await fetch(`/api/admin/employees/${resetEmpId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: resetEmpPass })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'שגיאה באיפוס סיסמת העובד.');
      }

      setResetSuccess('סיסמת העובד אופסה בהצלחה!');
      setResetEmpId('');
      setResetEmpPass('');
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  // Handle deleting employee
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`/api/admin/employees/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'שגיאה במחיקת העובד.');
      }

      // Success - refresh list and close modal
      setDeleteTarget(null);
      fetchEmployees();
    } catch (err) {
      alert(err.message);
    }
  };

  // Pre-fill reset password form from table click
  const triggerResetForEmployee = (empId) => {
    setResetEmpId(empId);
    setResetError('');
    setResetSuccess('');
    // Scroll to reset form
    const formElement = document.getElementById('reset-password-section');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-secondary)' }}>
        <h2>טוען פאנל ניהול מנהל...</h2>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {error && (
        <div className="form-error" style={{ margin: '20px 0' }}>
          <span>{error}</span>
        </div>
      )}

      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="page-title-area">
          <h2 className="page-title">אפשרויות מנהל</h2>
          <p className="page-subtitle">ניהול הרשאות, משתמשים ורשימת העובדים בארגון</p>
        </div>
      </div>

      <div className="admin-settings-section" style={{ marginTop: '0' }}>
        {/* Register Employee Card */}
        <div className="settings-card">
          <h3 className="settings-card-title">רישום עובד חדש</h3>
          
          <form onSubmit={handleAddEmployeeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {newEmpError && <div className="form-error"><span>{newEmpError}</span></div>}
            {newEmpSuccess && <div className="form-success"><span>{newEmpSuccess}</span></div>}

            <div className="form-group">
              <label className="form-label">שם מלא *</label>
              <input
                type="text"
                className="form-input"
                placeholder="לדוגמה: ישראל ישראלי"
                value={newEmpName}
                onChange={(e) => setNewEmpName(e.target.value)}
                disabled={newEmpLoading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">שם משתמש ייחודי *</label>
              <input
                type="text"
                className="form-input"
                placeholder="לדוגמה: israel1"
                value={newEmpUser}
                onChange={(e) => setNewEmpUser(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                disabled={newEmpLoading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">סיסמה ראשונית *</label>
              <input
                type="password"
                className="form-input"
                placeholder="הזן סיסמה..."
                value={newEmpPass}
                onChange={(e) => setNewEmpPass(e.target.value)}
                disabled={newEmpLoading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">טלפון (אופציונלי)</label>
              <input
                type="text"
                className="form-input"
                placeholder="לדוגמה: 052-1234567"
                value={newEmpPhone}
                onChange={(e) => setNewEmpPhone(e.target.value)}
                disabled={newEmpLoading}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }} disabled={newEmpLoading}>
              {newEmpLoading ? 'יוצר עובד...' : 'רשום עובד'}
            </button>
          </form>
        </div>

        {/* Reset Password Card */}
        <div className="settings-card" id="reset-password-section">
          <h3 className="settings-card-title">איפוס סיסמת עובד</h3>
          
          <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {resetError && <div className="form-error"><span>{resetError}</span></div>}
            {resetSuccess && <div className="form-success"><span>{resetSuccess}</span></div>}

            <div className="form-group">
              <label className="form-label">בחר עובד *</label>
              <select
                className="form-input"
                value={resetEmpId}
                onChange={(e) => setResetEmpId(e.target.value)}
                disabled={resetLoading}
              >
                <option value="">-- בחר עובד מתוך הרשימה --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.username})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">סיסמה חדשה *</label>
              <input
                type="password"
                className="form-input"
                placeholder="הזן סיסמה חדשה..."
                value={resetEmpPass}
                onChange={(e) => setResetEmpPass(e.target.value)}
                disabled={resetLoading}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }} disabled={resetLoading}>
              {resetLoading ? 'מאפס סיסמה...' : 'אפס סיסמה'}
            </button>
          </form>
        </div>
      </div>

      {/* Workers Management Table Card */}
      <div className="settings-card" style={{ marginTop: '24px' }}>
        <h3 className="settings-card-title">רשימת עובדים קיימים במערכת</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="employee-table">
            <thead>
              <tr>
                <th>שם מלא</th>
                <th>שם משתמש</th>
                <th>טלפון</th>
                <th>מזהה פנימי</th>
                <th>פעולות מהירות</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td><strong>{emp.full_name}</strong></td>
                  <td>@{emp.username}</td>
                  <td>{emp.phone || '—'}</td>
                  <td>{emp.id}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => triggerResetForEmployee(emp.id)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        title="אפס סיסמה"
                      >
                        🔑 שנה סיסמה
                      </button>
                      <button
                        className="btn btn-outline-danger"
                        onClick={() => setDeleteTarget({ id: emp.id, name: emp.full_name })}
                        style={{ padding: '6px 12px', fontSize: '12px', minWidth: '40px' }}
                        title="מחק עובד"
                      >
                        🗑️ מחק
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textCenter: 'center', color: 'var(--text-muted)' }}>
                    אין עובדים פעילים במערכת.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '400px', textAlign: 'center' }}
          >
            <div className="modal-header">
              <h2 className="modal-title">אישור מחיקה</h2>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>&times;</button>
            </div>
            
            <div className="modal-body" style={{ padding: '32px 24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
              <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                אתה בטוח שאתה רוצה למחוק את {deleteTarget.name}?
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                פעולה זו תסיר את העובד מהמערכת לצמיתות.
              </p>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center', gap: '16px', padding: '24px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setDeleteTarget(null)}
                style={{ minWidth: '100px' }}
              >
                לא, בטל
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleConfirmDelete}
                style={{ minWidth: '100px' }}
              >
                כן, מחק
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
