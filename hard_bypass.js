const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Cari baris inisialisasi express
const appInit = "const app = express();";

// Sisipkan middleware yang memalsukan sesi Owner
const bypassCode = appInit + `
// BYPASS TOKEN PAKSA: Anggap semua request sudah login sebagai Owner
app.use((req, res, next) => {
    req.user = { username: 'Dlizz', role: 'owner' };
    req.session = { user: { username: 'Dlizz', role: 'owner' } };
    req.token = 'bypass-token-12345';
    next();
});
`;

if (code.includes(appInit)) {
    code = code.replace(appInit, bypassCode);
    fs.writeFileSync('server.js', code);
    console.log('Bypass berhasil! Semua request sekarang dianggap milik Owner.');
} else {
    console.log('Gagal menemukan "const app = express();" di server.js');
}
