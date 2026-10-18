const express = require('express');
const os = require('os');
const config = require('../config');
const db = require('../db');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
});

router.get('/version', (req, res) => {
  res.json({ success: true, data: { version: config.version, env: config.nodeEnv } });
});

router.get('/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      users: db.users.length,
      notes: db.notes.length,
      activity: db.activity.length,
      memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      cpuLoad: os.loadavg(),
    },
  });
});

module.exports = router;
