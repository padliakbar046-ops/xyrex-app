const fs = require('fs');
const path = require('path');
const config = require('./config');

if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir, { recursive: true });
if (!fs.existsSync(config.backupDir)) fs.mkdirSync(config.backupDir, { recursive: true });

const USERS_FILE = path.join(config.dataDir, 'users.json');
const NOTES_FILE = path.join(config.dataDir, 'notes.json');
const LOGS_FILE = path.join(config.dataDir, 'activity.json');

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const db = {
  users: readJson(USERS_FILE, []),
  notes: readJson(NOTES_FILE, []),
  activity: readJson(LOGS_FILE, []),
  saveUsers() { writeJson(USERS_FILE, this.users); },
  saveNotes() { writeJson(NOTES_FILE, this.notes); },
  saveActivity() {
    if (this.activity.length > 5000) this.activity = this.activity.slice(-5000);
    writeJson(LOGS_FILE, this.activity);
  },
  logActivity(userId, action, meta) {
    this.activity.push({ ts: new Date().toISOString(), userId, action, meta: meta || null });
    this.saveActivity();
  },
  backup() {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(config.backupDir, `backup-${stamp}.json`);
    fs.writeFileSync(file, JSON.stringify({
      users: this.users,
      notes: this.notes,
    }, null, 2));
    return file;
  },
};

module.exports = db;
