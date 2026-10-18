const fs = require('fs');
const path = require('path');
const config = require('./config');

const LOG_DIR = path.resolve('./logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function write(level, msg, meta) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    meta: meta || null,
  });
  fs.appendFileSync(path.join(LOG_DIR, 'app.log'), line + '\n');
  console.log(`[${level}] ${msg}`);
}

module.exports = {
  info: (m, meta) => write('INFO', m, meta),
  warn: (m, meta) => write('WARN', m, meta),
  error: (m, meta) => write('ERROR', m, meta),
  activity: (userId, action, meta) => write('ACTIVITY', action, { userId, ...meta }),
  logDir: LOG_DIR,
};
