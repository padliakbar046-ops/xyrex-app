const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Tambahkan require patch di paling atas
code = "const bugNomor = require('./patch_bug_nomor.js');\nconst banGrup = require('./patch_ban_grup.js');\nconst fs = require('fs');\nconst path = require('path');\n" + code;

// 2. Sisipkan dataDir untuk Volume Railway setelah 'const app = express();'
code = code.replace(/(const app = express\(\);)/, "$1\nconst dataDir = '/app/data';\nif (!fs.existsSync(dataDir)) { fs.mkdirSync(dataDir, { recursive: true }); }");

// 3. Ubah path database ke /app/data
code = code.replace(/'\.\/users\.json'/g, "path.join(dataDir, 'users.json')");
code = code.replace(/'\.\/tokens\.json'/g, "path.join(dataDir, 'tokens.json')");
code = code.replace(/'\.\/chatlog\.json'/g, "path.join(dataDir, 'chatlog.json')");

// 4. Ubah folder auth Baileys ke /app/data/auth
code = code.replace(/useMultiFileAuthState\('auth'\)/g, "useMultiFileAuthState(path.join(dataDir, 'auth'))");

// 5. Suntikkan Endpoint Web Scanner & Bug/Ban Baru Sebelum server.listen
const newRoutes = `
// ==========================================
// WEB SCANNER REAL-TIME
// ==========================================
app.post('/api/tools/webscan', async (req, res) => {
    let { url } = req.body;
    if (!url) return res.status(400).json({ status: false, message: 'URL target kosong' });
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'http://' + url;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(url, { method: 'GET', signal: controller.signal, headers: { 'User-Agent': 'XYREX-Scanner' } });
        clearTimeout(timeout);

        const headers = response.headers;
        const vulnerabilities = [];
        const info = [];

        if (!headers.get('x-frame-options')) vulnerabilities.push({ type: 'Clickjacking', level: 'Medium', detail: 'Header X-Frame-Options tidak ada.' });
        if (!headers.get('content-security-policy')) vulnerabilities.push({ type: 'XSS', level: 'Medium', detail: 'Header Content-Security-Policy tidak ada.' });
        if (!headers.get('x-content-type-options')) vulnerabilities.push({ type: 'MIME Sniffing', level: 'Low', detail: 'Header X-Content-Type-Options tidak ada.' });
        if (!headers.get('strict-transport-security')) vulnerabilities.push({ type: 'SSL Strip', level: 'Low', detail: 'Header HSTS tidak ada.' });

        info.push('Server: ' + (headers.get('server') || 'Disembunyikan'));
        info.push('X-Powered-By: ' + (headers.get('x-powered-by') || 'Disembunyikan'));
        info.push('Status Code: ' + response.status);

        if (vulnerabilities.length === 0) vulnerabilities.push({ type: 'Header Config', level: 'Aman', detail: 'Semua header keamanan utama terpasang.' });
        res.json({ status: true, data: { target: url, info, vulnerabilities } });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message, data: { target: url, vulnerabilities: [{ type: 'Connection Error', level: 'Critical', detail: 'Website tidak merespon.' }] } });
    }
});

// Endpoint Bug & Ban Patch Baru
app.post('/api/bug/crash-ios', async (req, res) => { try { await bugNomor.bugCrashIOS(sock, req.body.target); res.json({status:true}); } catch(e) { res.status(500).json({error:e.message}); } });
app.post('/api/bug/foreclose', async (req, res) => { try { await bugNomor.bugForeclose(sock, req.body.target); res.json({status:true}); } catch(e) { res.status(500).json({error:e.message}); } });
app.post('/api/bug/crash', async (req, res) => { try { await bugNomor.bugCrash(sock, req.body.target); res.json({status:true}); } catch(e) { res.status(500).json({error:e.message}); } });
app.post('/api/bug/delay', async (req, res) => { try { await bugNomor.bugDelay(sock, req.body.target); res.json({status:true}); } catch(e) { res.status(500).json({error:e.message}); } });
app.post('/api/ban/crash', async (req, res) => { try { await banGrup.banGrupCrash(sock, req.body.groupId); res.json({status:true}); } catch(e) { res.status(500).json({error:e.message}); } });
app.post('/api/ban/ban', async (req, res) => { try { await banGrup.banGrupBan(sock, req.body.groupId, req.body.inviteCode); res.json({status:true}); } catch(e) { res.status(500).json({error:e.message}); } });
`;

const listenIndex = code.lastIndexOf('server.listen');
if (listenIndex !== -1) {
    code = code.slice(0, listenIndex) + newRoutes + "\n\n" + code.slice(listenIndex);
} else {
    code += newRoutes;
}

// 6. Tangkap QR Code untuk dikirim ke frontend
code = code.replace(/(sock\.ev\.on\('creds\.update'[^;]+;)/, "$1\n    sock.ev.on('connection.update', async (update) => {\n        const { qr } = update;\n        if (qr) { const QRCode = require('qrcode'); const qrImage = await QRCode.toDataURL(qr); io.emit('whatsapp-qr', qrImage); }\n    });");
code = code.replace(/printQRInTerminal:\s*true/g, 'printQRInTerminal: false');

fs.writeFileSync('server.js', code);
console.log('Semua fitur berhasil disuntikkan dengan aman!');
