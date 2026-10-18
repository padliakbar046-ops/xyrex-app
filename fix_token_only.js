const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Cari fungsi verifyToken dan buat agar selalu lolos (return next())
// Regex ini mencari fungsi verifyToken (baik function biasa atau arrow function)
code = code.replace(/(function\s+verifyToken\s*\([^)]*\)\s*\{)[\s\S]*?(\})/g, "$1 return next(); $2");
code = code.replace(/(const\s+verifyToken\s*=\s*\([^)]*\)\s*=>\s*\{)[\s\S]*?(\})/g, "$1 next(); return; $2");

// 2. Jika verifyToken tidak ditemukan, cari middleware auth secara global
// Kadang nama fungsinya 'auth', 'checkToken', atau dipanggil langsung di app.use
if (!code.includes('return next();') && !code.includes('next(); return;')) {
    // Paksa semua request yang mengirim header Authorization untuk dianggap valid
    code = code.replace(/(app\.use\s*\(\s*\(req,\s*res,\s*next\)\s*=>\s*\{)/g, "$1 req.user = { role: 'owner', username: 'Dlizz' }; return next();");
}

fs.writeFileSync('server.js', code);
console.log('Sistem Token berhasil dimatikan paksa (Verify Token Bypassed)!');
