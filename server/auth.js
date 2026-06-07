import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'mishmarot_super_secret_key_2026_capstone';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'משתמש לא מחובר - אנא התחבר מחדש.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'פג תוקף החיבור - אנא התחבר מחדש.' });
    }
    req.user = user;
    next();
  });
}
