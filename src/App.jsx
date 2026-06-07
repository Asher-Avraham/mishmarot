import { useState, useEffect } from 'react';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminPanel from './components/AdminPanel';
import DbStatus from './components/DbStatus';

function App() {
  const [token, setToken] = useState(localStorage.getItem('mishmarot_token') || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mishmarot_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Theme state defaulting to light mode
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('mishmarot_theme') || 'light';
  });

  // Apply theme class to <html> element
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('mishmarot_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Verify token on initial load
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
          throw new Error('Session expired');
        }

        const userData = await response.json();
        setUser(userData);
      } catch (err) {
        console.warn('Session verification failed, logging out:', err.message);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  // Handle successful login
  const handleLoginSuccess = (newToken, userData) => {
    localStorage.setItem('mishmarot_token', newToken);
    localStorage.setItem('mishmarot_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('mishmarot_token');
    localStorage.removeItem('mishmarot_user');
    setToken('');
    setUser(null);
  };

  // Intercept fetch to automatically logout on 401/403 errors
  useEffect(() => {
    const { fetch: originalFetch } = window;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401 || response.status === 403) {
        // Token expired or invalid
        handleLogout();
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-secondary)'
      }}>
        <h2>מאתחל מערכת...</h2>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Floating Toggle button for unauthenticated state */}
      {!user && (
        <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
          <button className="theme-toggle-btn" onClick={toggleTheme} title={theme === 'dark' ? 'מצב יום' : 'מצב לילה'}>
            {theme === 'dark' ? (
              // Sun Icon
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            ) : (
              // Moon Icon
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            )}
          </button>
        </div>
      )}

      <DbStatus />

      {user ? (
        <>
          <nav className="navbar">
            <div className="nav-brand">
              <span className="nav-logo">משמרות</span>
              <span className="nav-badge">
                {user.role === 'admin' ? 'מנהל מערכת' : 'עובד'}
              </span>
              
              {user.role === 'admin' && (
                <div style={{ display: 'flex', gap: '8px', marginRight: '24px' }}>
                  <button 
                    className={`btn ${currentPage === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`} 
                    onClick={() => setCurrentPage('dashboard')}
                    style={{ padding: '6px 14px', fontSize: '13px' }}
                  >
                    לוח שיבוץ
                  </button>
                  <button 
                    className={`btn ${currentPage === 'admin' ? 'btn-primary' : 'btn-secondary'}`} 
                    onClick={() => setCurrentPage('admin')}
                    style={{ padding: '6px 14px', fontSize: '13px' }}
                  >
                    ניהול עובדים
                  </button>
                </div>
              )}
            </div>
            
            <div className="nav-user">
              <div className="user-info">
                <span className="user-name">{user.fullName}</span>
                <span className="user-role">@{user.username}</span>
              </div>
              
              {/* Navbar Toggle button for authenticated state */}
              <button className="theme-toggle-btn" onClick={toggleTheme} title={theme === 'dark' ? 'מצב יום' : 'מצב לילה'} style={{ marginLeft: '4px', marginRight: '4px' }}>
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                )}
              </button>

              <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '8px 16px', fontSize: '13px' }}>
                התנתק
              </button>
            </div>
          </nav>

          <main className="main-content">
            {user.role === 'admin' ? (
              currentPage === 'admin' ? (
                <AdminPanel token={token} />
              ) : (
                <AdminDashboard token={token} />
              )
            ) : (
              <EmployeeDashboard token={token} />
            )}
          </main>

          <footer className="app-footer">
            <div className="footer-content">
              <p>© 2026 Ashi - כל הזכויות שמורות</p>
            </div>
          </footer>
        </>
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
