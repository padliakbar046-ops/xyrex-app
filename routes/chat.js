const express = require('express');
const router = express.Router();

router.get('/history', (req, res) => {
  const db = req.app.get('db');
  res.json({ ok: true, chat: db.read().chat.slice(-100) });
});

router.post('/send', (req, res) => {
  const { user, text } = req.body;
  if (!text) return res.status(400).json({ ok: false });
  const db = req.app.get('db');
  const io = req.app.get('io');
  const d = db.read();
  const entry = { user: user || 'anon', text: String(text).slice(0, 500), ts: Date.now() };
  d.chat.push(entry);
  if (d.chat.length > 500) d.chat = d.chat.slice(-500);
  db.write(d);
  io.emit('chat:message', entry);
  res.json({ ok: true, entry });
});

module.exports = router;
