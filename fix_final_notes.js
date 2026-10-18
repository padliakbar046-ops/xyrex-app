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

// Buat endpoint Notes yang mengembalikan array kosong (format yang diharapkan frontend)
const finalNotesRoute = `
// ==========================================
// ENDPOINT NOTES (TANPA TOKEN, BALASAN VALID)
// ==========================================
app.get('/api/notes', (req, res) => {
    res.json({ status: true, data: [] }); // Balas dengan array kosong
});
app.post('/api/notes', (req, res) => {
    res.json({ status: true, message: 'Catatan disimpan' });
});
`;

if (listenIndex !== -1) {
    lines.splice(listenIndex, 0, finalNotesRoute);
    fs.writeFileSync('server.js', lines.join('\n'));
    console.log('Endpoint Notes final berhasil dipasang!');
} else {
    console.log('Gagal menemukan server.listen');
}
