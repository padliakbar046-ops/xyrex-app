const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const SECRET_KEY = 'xyrex-super-secret-key-123';

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = req.app.get('db');
  const d = db.read();
  const u = d.users.find(x => x.username === username && x.password === password);
  
  if (!u) return res.status(401).json({ ok: false, msg: 'Username atau password salah' });
  
  // Buat token JWT
  const token = jwt.sign({ id: u.id, username: u.username, role: u.role }, SECRET_KEY, { expiresIn: '7d' });
  
  req.session.user = { id: u.id, username: u.username, role: u.role, avatar: u.avatar };
  res.json({ ok: true, user: req.session.user, token });
});

router.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ ok: false, msg: 'Missing fields' });
  const db = req.app.get('db');
  const d = db.read();
  if (d.users.find(x => x.username === username)) return res.status(409).json({ ok: false, msg: 'Username taken' });
  const u = { id: Date.now(), username, password, role: 'member', avatar: 1, createdAt: Date.now() };
  d.users.push(u);
  db.write(d);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ ok: false });
  res.json({ ok: true, user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.post('/change-password', (req, res) => {
  if (!req.session.user) return res.status(401).json({ ok: false, msg: 'Unauthorized' });
  const { oldPass, newPass } = req.body;
  const db = req.app.get('db');
  const d = db.read();
  const u = d.users.find(x => x.id === req.session.user.id);
  
  if (!u || u.password !== oldPass) return res.status(400).json({ ok: false, msg: 'Password lama salah' });
  if (newPass.length < 5) return res.status(400).json({ ok: false, msg: 'Password baru minimal 5 karakter' });
  
  u.password = newPass;
  db.write(d);
  res.json({ ok: true, msg: 'Password berhasil diubah' });
});

module.exports = router;
