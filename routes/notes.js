const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const db = req.app.get('db');
  const now = Date.now();
  const d = db.read();
  d.notes = d.notes.filter(n => n.expiresAt > now);
  db.write(d);
  res.json({ ok: true, notes: d.notes });
});

router.post('/', (req, res) => {
  const { username, text, music } = req.body;
  if (!username || !text) return res.status(400).json({ ok: false, msg: 'Missing fields' });
  const db = req.app.get('db');
  const d = db.read();
  d.notes = d.notes.filter(n => n.username !== username && n.expiresAt > Date.now());
  if (d.notes.find(n => n.username === username)) return res.status(409).json({ ok: false, msg: 'Max 1 note per user' });
  const note = { id: Date.now(), username, text: String(text).slice(0, 200), music: music || null, createdAt: Date.now(), expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
  d.notes.push(note);
  db.write(d);
  res.json({ ok: true, note });
});

router.delete('/:id', (req, res) => {
  const db = req.app.get('db');
  const d = db.read();
  d.notes = d.notes.filter(n => String(n.id) !== req.params.id);
  db.write(d);
  res.json({ ok: true });
});

module.exports = router;
