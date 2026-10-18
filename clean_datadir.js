const fs = require('fs');

let lines = fs.readFileSync('server.js', 'utf8').split('\n');

// 1. Buang SEMUA baris yang mengandung deklarasi dataDir dan fs.existsSync
lines = lines.filter(line => {
    const l = line.trim();
    return !l.includes("const dataDir =") && !l.includes("fs.existsSync(dataDir)");
});

// 2. Cari baris 'const express = require'
let expressIndex = lines.findIndex(line => line.includes("const express = require"));

if (expressIndex !== -1) {
    // 3. Sisipkan dataDir tepat di bawah express
    lines.splice(expressIndex + 1, 0, 
        "const dataDir = '/app/data';",
        "if (!fs.existsSync(dataDir)) { fs.mkdirSync(dataDir, { recursive: true }); }"
    );
}

fs.writeFileSync('server.js', lines.join('\n'));
console.log('server.js sudah 100% bersih dari duplikasi dataDir!');
