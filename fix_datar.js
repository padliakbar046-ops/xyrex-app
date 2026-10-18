const fs = require('fs');

// Baca file server.js
let lines = fs.readFileSync('server.js', 'utf8').split('\n');

// 1. Hapus semua baris yang mengandung dataDir atau fs.existsSync
lines = lines.filter(line => !line.includes("dataDir") && !line.includes("fs.existsSync"));

// 2. Cari baris ke berapa 'const http = require' berada
let httpIndex = lines.findIndex(line => line.includes("const http = require('http');"));

if (httpIndex !== -1) {
    // 3. Sisipkan dataDir tepat di bawah 'const http = require'
    lines.splice(httpIndex + 1, 0, 
        "const dataDir = '/app/data';",
        "if (!fs.existsSync(dataDir)) { fs.mkdirSync(dataDir, { recursive: true }); }"
    );
}

// Tulis kembali ke server.js
fs.writeFileSync('server.js', lines.join('\n'));
console.log('server.js berhasil diperbaiki!');
