const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Kita cari 'const app = express();' dan suntikkan middleware bypass
if (code.includes("const app = express();")) {
    code = code.replace("const app = express();", `const app = express();\napp.use((req, res, next) => { req.user = { username: 'Dlizz', role: 'owner' }; req.token = 'valid'; next(); });`);
    fs.writeFileSync('server.js', code);
    console.log('Bypass total berhasil disuntikkan!');
} else {
    console.log('Gagal menemukan "const app = express();"');
}
