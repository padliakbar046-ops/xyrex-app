const config = require('../config');
const db = require('../db');

function requireAuth(req, res, next) {
  const token = req.headers['x-session'] || req.query.session;
  if (!token) return res.status(401).json({ success: false, error: 'No session' });
  const user = db.users.find(u => u.session === token);
  if (!user) return res.status(401).json({ success: false, error: 'Invalid session' });
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'No auth' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
