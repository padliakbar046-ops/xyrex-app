const config = require('../config');

const hits = new Map();

function rateLimit(req, res, next) {
  const key = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  const max = config.rateLimit.max;

  let entry = hits.get(key);
  if (!entry || now - entry.start > windowMs) {
    entry = { start: now, count: 0 };
    hits.set(key, entry);
  }
  entry.count++;

  res.setHeader('X-RateLimit-Limit', max);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));

  if (entry.count > max) {
    return res.status(429).json({ success: false, error: 'Rate limit exceeded' });
  }
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) {
    if (now - v.start > config.rateLimit.windowMs * 2) hits.delete(k);
  }
}, 60000);

module.exports = rateLimit;
