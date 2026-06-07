import { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('אנא מלא את כל השדות.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בהתחברות למערכת.');
      }

      // Success
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo">משמרות</h1>
          <p className="auth-subtitle">מערכת סידור עבודה שבועי - כניסה למורשים</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div className="form-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="username">שם משתמש</label>
            <input
              type="text"
              id="username"
              className="form-input"
              placeholder="הזן שם משתמש..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">סיסמה</label>
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="הזן סיסמה..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'מתחבר...' : 'התחבר למערכת'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
          ברירת מחדל למנהל: <strong>admin / admin1234</strong>
        </div>
      </div>
    </div>
  );
}
