import { useState, useEffect, useCallback } from 'react';

export default function DbStatus() {
  const [status, setStatus] = useState('checking');

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
    } catch {
      setStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [check]);

  return (
    <div className={`db-status db-status--${status}`} title={status === 'connected' ? 'מחובר לבסיס הנתונים' : 'לא מחובר לבסיס הנתונים'}>
      <span className="db-status-dot" />
      <span className="db-status-text">
        {status === 'checking' ? 'בודק...' : status === 'connected' ? 'מחובר לבסיס נתונים' : 'לא מחובר לבסיס נתונים'}
      </span>
    </div>
  );
}
