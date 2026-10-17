const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileP = promisify(execFile);

async function which(bin) {
  try { await execFileP('which', [bin]); return true; }
  catch { return false; }
}

async function listInterfaces() {
  try {
    const { stdout } = await execFileP('iw', ['dev']);
    const ifaces = [];
    const re = /Interface\s+(\S+)/g;
    let m;
    while ((m = re.exec(stdout))) ifaces.push(m[1]);
    return ifaces;
  } catch { return []; }
}

async function capabilities() {
  const [aireplay, mdk4, iw, bettercap] = await Promise.all([
    which('aireplay-ng'), which('mdk4'), which('iw'), which('bettercap')
  ]);
  return { aireplay, mdk4, iw, bettercap };
}

module.exports = { listInterfaces, capabilities };
