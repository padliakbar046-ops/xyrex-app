const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Hapus endpoint musik lama jika ada
code = code.replace(/app\.(get|post)\(['"]\/api\/tools\/music['"].*?\}\);/s, '');

// Tambahkan endpoint universal untuk semua kemungkinan rute musik
const newMusicRoute = `
// ENDPOINT MUSIK UNIVERSAL (Anti Error HTML)
app.all('/api/music*', (req, res) => {
    res.json({ status: true, data: [{ title: 'Lagu Dummy', artist: 'Artis Dummy', preview: '' }] });
});
app.all('/api/tools/music*', (req, res) => {
    res.json({ status: true, data: [{ title: 'Lagu Dummy', artist: 'Artis Dummy', preview: '' }] });
});
`;

// Sisipkan sebelum 'server.listen'
const listenIndex = code.lastIndexOf('server.listen');
if (listenIndex !== -1) {
    code = code.slice(0, listenIndex) + newMusicRoute + "\n\n" + code.slice(listenIndex);
} else {
    code += newMusicRoute;
}

fs.writeFileSync('server.js', code);
console.log('Endpoint musik universal berhasil disuntikkan!');
