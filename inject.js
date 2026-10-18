const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

// 1. Tambahkan Require Patch di paling atas
serverCode = "const bugNomor = require('./patch_bug_nomor.js');\nconst banGrup = require('./patch_ban_grup.js');\n" + serverCode;

// 2. Buat blok kode Web Scanner Real-Time & Endpoint Bug/Ban baru
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
        
        const response = await fetch(url, { 
            method: 'GET', 
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) XYREX-Scanner' }
        });
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

        const dns = require('dns').promises;
        const hostname = new URL(url).hostname;
        try {
            const addresses = await dns.lookup(hostname, { all: true });
            info.push('IP Address: ' + addresses.map(a => a.address).join(', '));
        } catch (e) { info.push('IP Address: Gagal resolve DNS'); }

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

// Cari baris 'app.listen' atau 'server.listen' dan sisipkan rute baru di atasnya
const listenIndex = serverCode.lastIndexOf('server.listen');
if (listenIndex !== -1) {
    serverCode = serverCode.slice(0, listenIndex) + newRoutes + "\n\n" + serverCode.slice(listenIndex);
} else {
    // Fallback jika tidak ada server.listen
    serverCode += newRoutes;
}

fs.writeFileSync('server.js', serverCode);
console.log('Selesai menyuntikkan kode dengan aman!');
