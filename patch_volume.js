const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Pastikan folder /app/data ada (dibuat otomatis oleh Railway, tapi kita pastikan)
const dataDir = '/app/data';
if (!code.includes("const dataDir = '/app/data'")) {
    code = "const fs = require('fs');\nconst path = require('path');\nconst dataDir = '/app/data';\nif (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });\n" + code;
}

// 2. Ubah lokasi file users.json, tokens.json, chatlog.json ke dalam /app/data
code = code.replace(/(['"])(users\.json|tokens\.json|chatlog\.json)\1/g, "'" + dataDir + "/$2'");

// 3. Ubah folder session Baileys (auth) ke dalam /app/data
code = code.replace(/useMultiFileAuthState\((['"])auth\1\)/g, "useMultiFileAuthState('" + dataDir + "/auth')");

fs.writeFileSync('server.js', code);
console.log('server.js berhasil diarahkan ke Volume Railway (/app/data)!');
