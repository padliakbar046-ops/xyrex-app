const express = require('express');
const router = express.Router();
const pairingRouter = require('./pairing');

router.post('/spam', async (req, res) => {
  try {
    const { groupLink, count } = req.body;
    if (!groupLink) return res.status(400).json({ ok: false, msg: 'Missing groupLink' });

    const sock = pairingRouter.getSock();
    if (!sock) return res.status(400).json({ ok: false, msg: 'WhatsApp belum di-pairing. Silakan ke menu Pairing.' });

    const code = groupLink.split('chat.whatsapp.com/')[1];
    if (!code) return res.status(400).json({ ok: false, msg: 'Link grup tidak valid' });

    const total = Math.min(Number(count) || 5, 20);
    let done = 0;

    // Jalankan di background biar UI ga nge-hang
    res.json({ ok: true, msg: `Memulai spam ${total}x join/leave ke grup`, code });

    (async () => {
      for (let i = 0; i < total; i++) {
        try {
          await sock.groupAcceptInvite(code); // Join
          await new Promise(r => setTimeout(r, 1500));
          const metadata = await sock.groupGetInviteInfo(code);
          if (metadata && metadata.id) {
            await sock.groupLeave(metadata.id); // Leave
          }
          done++;
        } catch (err) {
          console.log('Spam grup error:', err.message);
        }
      }
      console.log(`[BAN GRUP] Selesai. Berhasil ${done}/${total} siklus.`);
    })();

  } catch (e) {
    res.status(500).json({ ok: false, msg: e.message });
  }
});

module.exports = router;
