const fs = require('fs');

// Baca file
let lines = fs.readFileSync('server.js', 'utf8').split('\n');

// 1. Buang SEMUA baris yang mengandung deklarasi fs atau path
lines = lines.filter(line => {
    const l = line.trim();
    return !l.startsWith('const fs = require') && !l.startsWith('const path = require');
});

// 2. Tambahkan deklarasi fs dan path yang bersih di paling atas
lines.unshift(
    "const fs = require('fs');",
    "const path = require('path');"
);

// Tulis kembali
fs.writeFileSync('server.js', lines.join('\n'));
console.log('server.js sudah 100% bersih dari duplikasi fs dan path!');
