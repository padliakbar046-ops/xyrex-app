require('dotenv').config();
const path = require('path');

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  owner: {
    username: process.env.OWNER_USERNAME || 'Dlizz',
    password: process.env.OWNER_PASSWORD || '20111608',
  },
  sessionSecret: process.env.SESSION_SECRET || 'xyrex-default-secret-change-me',
  dataDir: DATA_DIR,
  backupDir: path.join(DATA_DIR, 'backup'),
  backupIntervalHours: parseInt(process.env.BACKUP_INTERVAL_HOURS || '24', 10),
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '60', 10),
  },
  version: require('./package.json').version,
};
