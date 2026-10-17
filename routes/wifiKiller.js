const express = require('express');
const router = express.Router();
const runner = require('../tools/wifiKiller/runner');
const { listInterfaces, capabilities } = require('../tools/wifiKiller/detector');

module.exports = function makeWifiKiller(requireAuth, io) {

  runner.on('log', (id, line) => {
    if (io) io.to('wifi-killer:' + id).emit('wifi-killer:log', { id, line });
  });
  runner.on('exit', (id, info) => {
    if (io) io.to('wifi-killer:' + id).emit('wifi-killer:exit', { id, info });
  });

  router.get('/api/tools/wifi-killer/info', requireAuth, async (req, res) => {
    try {
      const [ifaces, caps] = await Promise.all([listInterfaces(), capabilities()]);
      return res.json({ ok: true, interfaces: ifaces, capabilities: caps });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e.message || e) });
    }
  });

  router.post('/api/tools/wifi-killer/start', requireAuth, async (req, res) => {
    try {
      const b = req.body || {};
      if (!b.mode || !b.iface) {
        return res.status(400).json({ ok: false, error: 'mode & iface wajib' });
      }
      if ((b.mode === 'deauth' || b.mode === 'disassoc') && !b.bssid) {
        return res.status(400).json({ ok: false, error: 'bssid wajib untuk mode ini' });
      }
      const id = runner.start({
        mode: b.mode, iface: b.iface, bssid: b.bssid,
        channel: b.channel, count: b.count, ssid: b.ssid, duration: b.duration
      });
      return res.json({ ok: true, id, room: 'wifi-killer:' + id });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e.message || e) });
    }
  });

  router.post('/api/tools/wifi-killer/stop', requireAuth, (req, res) => {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, error: 'id wajib' });
    const ok = runner.stop(id);
    return res.json({ ok, id });
  });

  router.get('/api/tools/wifi-killer/list', requireAuth, (req, res) => {
    return res.json({ ok: true, sessions: runner.list() });
  });

  return router;
};
