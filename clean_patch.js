const fs = require('fs');

// Baca file
let lines = fs.readFileSync('server.js', 'utf8').split('\n');

// 1. Buang SEMUA baris yang mengandung deklarasi patch bug/ban
lines = lines.filter(line => {
    const l = line.trim();
    return !l.includes("require('./patch_bug_nomor.js')") && !l.includes("require('./patch_ban_grup.js')");
});

// 2. Tambahkan deklarasi patch yang bersih di paling atas (tepat setelah fs dan path)
lines.splice(2, 0, 
    "const bugNomor = require('./patch_bug_nomor.js');",
    "const banGrup = require('./patch_ban_grup.js');"
);

// Tulis kembali
fs.writeFileSync('server.js', lines.join('\n'));
console.log('server.js sudah 100% bersih dari duplikasi bugNomor dan banGrup!');
