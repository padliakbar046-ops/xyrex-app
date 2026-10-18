const fs = require('fs');
let lines = fs.readFileSync('server.js', 'utf8').split('\n');

// Cari baris terakhir yang mengandung 'server.listen'
let listenIndex = -1;
for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('server.listen')) {
        listenIndex = i;
        break;
    }
}

// Buat endpoint musik universal (menggunakan app.all agar GET/POST ditangkap)
const musicRoute = `
// ==========================================
// ENDPOINT MUSIK UNIVERSAL
// ==========================================
app.all('/api/music*', (req, res) => {
    res.json({ status: true, data: [{ title: 'Lagu Dummy', artist: 'Artis Dummy', preview: '' }] });
});
app.all('/api/tools/music*', (req, res) => {
    res.json({ status: true, data: [{ title: 'Lagu Dummy', artist: 'Artis Dummy', preview: '' }] });
});
`;

if (listenIndex !== -1) {
    // Sisipkan sebelum server.listen
    lines.splice(listenIndex, 0, musicRoute);
    fs.writeFileSync('server.js', lines.join('\n'));
    console.log('Endpoint musik berhasil disuntikkan dengan aman!');
} else {
    console.log('Gagal menemukan server.listen di server.js');
}
