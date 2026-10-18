const express = require('express');
const router = express.Router();

// Middleware cek login dan role
function requireAdmin(req, res, next) {
  const u = req.session.user;
  if (!u || (u.role !== 'owner' && u.role !== 'admin')) {
    return res.status(403).json({ ok: false, msg: 'Akses ditolak. Anda bukan Admin/Owner.' });
  }
  next();
}

router.get('/users', requireAdmin, (req, res) => {
  const db = req.app.get('db');
  const d = db.read();
  res.json({ ok: true, users: d.users.map(u => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt })) });
});

router.post('/user', requireAdmin, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ ok: false, msg: 'Username dan password wajib diisi' });
  
  const db = req.app.get('db');
  const d = db.read();
  
  if (d.users.find(u => u.username === username)) {
    return res.status(409).json({ ok: false, msg: 'Username sudah dipakai' });
  }

  const currentUser = req.session.user;
  let finalRole = 'member';

  if (currentUser.role === 'owner') {
    // Owner bebas milih role apapun
    const allowedOwner = ['owner', 'admin', 'premium', 'member'];
    finalRole = allowedOwner.includes(role) ? role : 'member';
  } else if (currentUser.role === 'admin') {
    // Admin cuma boleh bikin Admin, Premium, Member (Ga bisa bikin Owner)
    const allowedAdmin = ['admin', 'premium', 'member'];
    finalRole = allowedAdmin.includes(role) ? role : 'member';
  }

  const u = { id: Date.now(), username, password, role: finalRole, avatar: 1, createdAt: Date.now() };
  d.users.push(u);
  db.write(d);
  res.json({ ok: true, msg: 'Akun berhasil dibuat', user: { id: u.id, username: u.username, role: u.role } });
});

// HANYA OWNER YANG BISA MENGHAPUS AKUN
router.delete('/user/:id', (req, res) => {
  const currentUser = req.session.user;
  if (!currentUser || currentUser.role !== 'owner') {
    return res.status(403).json({ ok: false, msg: 'Hanya Owner yang bisa menghapus akun.' });
  }

  const db = req.app.get('db');
  const d = db.read();
  
  const targetUser = d.users.find(u => String(u.id) === req.params.id);
  if (!targetUser) return res.status(404).json({ ok: false, msg: 'User tidak ditemukan' });
  
  // Cegah owner menghapus dirinya sendiri
  if (targetUser.id === currentUser.id) {
    return res.status(400).json({ ok: false, msg: 'Anda tidak bisa menghapus akun sendiri' });
  }

  d.users = d.users.filter(u => String(u.id) !== req.params.id);
  db.write(d);
  res.json({ ok: true, msg: 'Akun berhasil dihapus' });
});

module.exports = router;
