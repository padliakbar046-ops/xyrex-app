const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Cari fungsi middleware yang biasanya dipakai untuk cek token
// Kita akan memaksa fungsi tersebut untuk langsung memanggil next() tanpa ngecek apa-apa
const middlewarePatterns = [
    /app\.use\(\(req,\s*res,\s*next\)\s*=>\s*\{[\s\S]*?verify[\s\S]*?\}\);/g,
    /const\s+auth\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?verify[\s\S]*?\}/g,
    /function\s+auth\s*\([^)]*\)\s*\{[\s\S]*?verify[\s\S]*?\}/g
];

let replaced = false;
middlewarePatterns.forEach(pattern => {
    if (pattern.test(code)) {
        code = code.replace(pattern, "app.use((req, res, next) => { next(); });"); // Bypass total
        replaced = true;
    }
});

// 2. Jika tidak ketemu pattern di atas, cari endpoint simpan catatan dan suntikkan bypass
if (!replaced) {
    // Cari endpoint yang menangani simpan catatan (biasanya ada kata 'notes' atau 'catatan')
    const notePattern = /(app\.(post|put)\(['"][^'"]*(notes|catatan)[^'"]*['"],\s*(async\s*)?\(req,\s*res\)\s*=>\s*\{)/gi;
    if (notePattern.test(code)) {
        code = code.replace(notePattern, "$1\n    // BYPASS: Paksa lewati validasi token\n    req.user = { username: 'Dlizz', role: 'owner' };");
        replaced = true;
    }
}

if (replaced) {
    fs.writeFileSync('server.js', code);
    console.log('Berhasil! Sistem validasi token telah di-bypass (dimatikan paksa).');
} else {
    console.log('Gagal menemukan fungsi validasi. Silakan cek manual file server.js.');
}
