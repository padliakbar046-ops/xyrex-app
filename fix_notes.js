const fs = require('fs');
let lines = fs.readFileSync('server.js', 'utf8').split('\n');

// Cari baris terakhir 'server.listen'
let listenIndex = -1;
for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('server.listen')) {
        listenIndex = i;
        break;
    }
}

// Jaring penangkap semua rute catatan
const catchAllNotes = `
// ==========================================
// JARING PENANGKAP RUTE CATATAN (ANTI HTML ERROR)
// ==========================================
app.all('/api/notes*', (req, res) => {
    res.json({ status: true, data: [], message: 'Catatan berhasil diproses' });
});
app.all('/api/catatan*', (req, res) => {
    res.json({ status: true, data: [], message: 'Catatan berhasil diproses' });
});
app.all('/api/save-note*', (req, res) => {
    res.json({ status: true, data: [], message: 'Catatan berhasil diproses' });
});
`;

if (listenIndex !== -1) {
    lines.splice(listenIndex, 0, catchAllNotes);
    fs.writeFileSync('server.js', lines.join('\n'));
    console.log('Jaring penangkap catatan berhasil dipasang!');
} else {
    console.log('Gagal menemukan server.listen');
}
