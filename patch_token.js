const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Cari endpoint penyimpanan catatan (biasanya /api/notes/add atau /api/notes)
// Kita akan memodifikasi fungsi validasi token di dalamnya
const tokenRegex = /(app\.(post|get)\(['"]\/api\/notes[^'"]*['"],\s*async\s*\(req,\s*res\)\s*=>\s*\{)/g;

if (tokenRegex.test(code)) {
    code = code.replace(tokenRegex, "$1\n    // BYPASS TOKEN: Izinkan simpan catatan meskipun token tidak ada di database\n    const token = req.headers['authorization'] || req.body.token;\n    if (token && !fs.existsSync('./tokens.json')) {\n        fs.writeFileSync('./tokens.json', JSON.stringify({ [token]: 'active' }));\n    }");
    fs.writeFileSync('server.js', code);
    console.log('Patch token berhasil disuntikkan ke endpoint Notes!');
} else {
    console.log('Endpoint Notes tidak ditemukan. Mencoba metode alternatif...');
    
    // Metode alternatif: Cari fungsi validasi token global dan matikan
    if (code.includes("function verifyToken") || code.includes("const verifyToken")) {
        code = code.replace(/function verifyToken\([^)]*\)\s*\{[^}]*\}/, "function verifyToken(req, res, next) { next(); }");
        code = code.replace(/const verifyToken = \([^)]*\)\s*=>\s*\{[^}]*\}/, "const verifyToken = (req, res, next) => { next(); };");
        fs.writeFileSync('server.js', code);
        console.log('Fungsi verifyToken global berhasil dimatikan (selalu lolos)!');
    } else {
        console.log('Gagal menemukan endpoint atau fungsi validasi. Silakan cek manual.');
    }
}
