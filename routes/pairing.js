const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const QRCode = require('qrcode');

let sock = null;
let qrData = null;
let isConnected = false;
let pairingCodeData = null;

// Fungsi inisialisasi Socket WA
async function initWA() {
  try {
    const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
    const dataDir = path.join(__dirname, '..', 'data', 'baileys');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    
    const { state, saveCreds } = await useMultiFileAuthState(dataDir);
    const { version } = await fetchLatestBaileysVersion();
    
    if (sock) {
      try { sock.end(undefined); } catch (e) {}
    }

    sock = makeWASocket({
      version,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      auth: state,
      browser: ['XYREX', 'Chrome', '1.0.0'],
      generateHighQualityLinkPreview: true,
      syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) qrData = qr;
      
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        isConnected = false;
        qrData = null;
        pairingCodeData = null;
        
        if (shouldReconnect) {
          // Koneksi terputus, coba lagi setelah 3 detik
          setTimeout(initWA, 3000);
        }
      } else if (connection === 'open') {
        isConnected = true;
        qrData = null;
        pairingCodeData = null;
      }
    });
    
    return sock;
  } catch (e) {
    console.error('Error init WA:', e);
    throw e;
  }
}

router.post('/start', async (req, res) => {
  try {
    await initWA();
    res.json({ ok: true, msg: 'Pairing engine started' });
  } catch (e) {
    res.status(500).json({ ok: false, msg: e.message });
  }
});

router.get('/qr', async (req, res) => {
  if (isConnected) return res.json({ ok: true, connected: true, msg: 'WhatsApp sudah terhubung!' });
  if (!qrData) return res.json({ ok: false, msg: 'Menunggu QR dari server WA...' });
  
  try {
    const img = await QRCode.toDataURL(qrData, { margin: 2, width: 300 });
    res.json({ ok: true, image: img });
  } catch (e) {
    res.status(500).json({ ok: false, msg: e.message });
  }
});

router.post('/code', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!sock) return res.status(400).json({ ok: false, msg: 'Engine belum menyala. Klik START PAIRING dulu.' });
    if (isConnected) return res.status(400).json({ ok: false, msg: 'WhatsApp sudah terhubung.' });
    
    // Format nomor harus 62xxx (tanpa +)
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    
    if (!cleanPhone.startsWith('62')) {
      return res.status(400).json({ ok: false, msg: 'Nomor harus diawali 62.' });
    }

    // Tunggu sebentar agar socket siap
    await new Promise(r => setTimeout(r, 2000));
    
    const code = await sock.requestPairingCode(cleanPhone);
    pairingCodeData = code;
    res.json({ ok: true, code });
  } catch (e) {
    res.status(500).json({ ok: false, msg: e.message || 'Gagal meminta pairing code' });
  }
});

router.get('/status', (req, res) => {
  res.json({ ok: true, connected: isConnected });
});

router.getSock = () => sock;

module.exports = router;
