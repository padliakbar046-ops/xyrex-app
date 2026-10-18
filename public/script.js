const socket = io();
let currentUser = null;
let selectedSender = 'private';

async function api(path, opts = {}) {
  const r = await fetch('/api' + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'include'
  });
  return r.json();
}

function customAlert(title, desc) {
  let overlay = document.getElementById('customModal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'customModal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-icon">!</div>
        <div class="modal-title" id="modalTitle"></div>
        <div class="modal-desc" id="modalDesc"></div>
        <button class="neo-btn" style="background:#000;color:#fff;" onclick="closeModal()">OK</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalDesc').textContent = desc;
  overlay.classList.add('show');
}
function closeModal() {
  document.getElementById('customModal').classList.remove('show');
}

/* THEME */
function toggleTheme() {
  const isDark = document.getElementById('darkModeToggle').checked;
  if (isDark) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('xyrex_theme', 'dark');
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('xyrex_theme', 'light');
  }
}

function loadTheme() {
  const saved = localStorage.getItem('xyrex_theme');
  if (saved === 'dark') {
    document.body.classList.add('dark-mode');
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = true;
  }
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
}

function router() {
  if (!currentUser) return showPage('login');
  const hash = (location.hash || '#chat').slice(1);
  const validBase = ['chat','pairing','bug','bangrup','tools','notes','admin','settings'];
  const rootPath = hash.split('/')[0];
  const view = validBase.includes(rootPath) ? rootPath : 'chat';

  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.dataset.view === hash));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.nav === view));

  if (view === 'admin') loadUsers();
  if (view === 'notes') loadNotes();
  if (view === 'settings') loadProfile();
  if (view === 'bug') {
    loadBugProfile();
    loadSenderStatus();
  }
}
window.addEventListener('hashchange', router);

async function doLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const r = await api('/auth/login', { method: 'POST', body: { username, password } });
  
  if (!r.ok) return customAlert('Login Gagal', r.msg || 'Username atau password salah.');
  
  currentUser = r.user;
  enterApp();
}

function enterApp() {
  showPage('app');
  document.getElementById('userBox').textContent = `@${currentUser.username}`;
  document.getElementById('navAdmin').style.display =
    (currentUser.role === 'owner' || currentUser.role === 'admin') ? '' : 'none';
  
  const roleSelect = document.getElementById('newRole');
  if (roleSelect) {
    const ownerOption = Array.from(roleSelect.options).find(opt => opt.value === 'owner');
    if (ownerOption) {
      ownerOption.style.display = (currentUser.role === 'owner') ? '' : 'none';
    }
  }

  if (!location.hash) location.hash = '#chat';
  router();
  socket.emit('chat:join');
}

async function doLogout() {
  await api('/auth/logout', { method: 'POST' });
  currentUser = null;
  location.hash = '';
  showPage('login');
  document.getElementById('loginPass').value = '';
}

function loadProfile() {
  if (!currentUser) return;
  document.getElementById('profileName').textContent = currentUser.username;
  document.getElementById('profileRole').textContent = `Role: ${currentUser.role.toUpperCase()}`;
  document.querySelector('.profile-avatar').textContent = currentUser.username.charAt(0).toUpperCase();
}

function loadBugProfile() {
  if (!currentUser) return;
  document.getElementById('bugProfileName').textContent = currentUser.username;
  document.getElementById('bugProfileRole').textContent = currentUser.role.toUpperCase();
}

function switchBugTab(tab) {
  document.querySelectorAll('.bug-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.bug-content').forEach(c => c.classList.add('hidden'));
  
  if (tab === 'nomor') {
    document.querySelectorAll('.bug-tab')[0].classList.add('active');
    document.getElementById('tabBugNomor').classList.remove('hidden');
    document.getElementById('tabBugNomor').classList.add('active');
  } else {
    document.querySelectorAll('.bug-tab')[1].classList.add('active');
    document.getElementById('tabBugGroup').classList.remove('hidden');
  }
}

function toggleBugAccordion() {
  const body = document.getElementById('bugAccordionBody');
  const arrow = document.getElementById('bugArrow');
  if (body.classList.contains('open')) {
    body.classList.remove('open');
    arrow.style.transform = 'rotate(0deg)';
  } else {
    body.classList.add('open');
    arrow.style.transform = 'rotate(180deg)';
  }
}

async function loadSenderStatus() {
  const r = await api('/pairing/status');
  const globalCount = r.ok ? (r.globalSenders || 0) : 0;
  
  document.getElementById('globalCount').textContent = globalCount;

  const boxGlobal = document.getElementById('boxGlobal');
  const boxPrivate = document.getElementById('boxPrivate');

  if (globalCount === 0) {
    boxGlobal.classList.add('disabled');
    boxGlobal.onclick = null;
  } else {
    boxGlobal.classList.remove('disabled');
    boxGlobal.onclick = () => selectSender('global');
  }
}

function selectSender(type) {
  if (type === 'global') {
    const boxGlobal = document.getElementById('boxGlobal');
    if (boxGlobal.classList.contains('disabled')) return;
  }

  selectedSender = type;
  
  const boxGlobal = document.getElementById('boxGlobal');
  const boxPrivate = document.getElementById('boxPrivate');

  if (type === 'global') {
    boxGlobal.classList.add('active');
    boxPrivate.classList.remove('active');
  } else {
    boxPrivate.classList.add('active');
    boxGlobal.classList.remove('active');
  }
}

async function changePassword() {
  const oldPass = document.getElementById('oldPass').value;
  const newPass = document.getElementById('newPass').value;
  if (!oldPass || !newPass) return customAlert('Kosong', 'Isi password lama dan baru.');
  
  const r = await api('/auth/change-password', { method: 'POST', body: { oldPass, newPass } });
  if (!r.ok) return customAlert('Gagal', r.msg);
  
  customAlert('Sukses', r.msg);
  document.getElementById('oldPass').value = '';
  document.getElementById('newPass').value = '';
}

socket.on('chat:history', list => {
  const box = document.getElementById('chatBox');
  if (!box) return;
  box.innerHTML = '';
  list.forEach(addChatMsg);
});
socket.on('chat:message', addChatMsg);

function addChatMsg(m) {
  const box = document.getElementById('chatBox');
  if (!box) return;
  const div = document.createElement('div');
  div.className = 'chat-msg';
  const roleClass = m.role ? `role-${m.role}` : 'role-member';
  div.innerHTML = `<span class="chat-user ${roleClass}">${escape(m.user)}</span>: ${escape(m.text)}`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}
function escape(s) { return String(s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }

function sendChat() {
  const input = document.getElementById('chatInput');
  if (!input.value.trim()) return;
  socket.emit('chat:send', { user: currentUser.username, role: currentUser.role, text: input.value.trim() });
  input.value = '';
}

async function startPairing() {
  const qrContainer = document.getElementById('qrContainer');
  const qrImage = document.getElementById('qrImage');
  const qrBox = document.getElementById('qrBox');
  
  qrContainer.classList.add('hidden');
  qrBox.classList.remove('hidden');
  qrBox.textContent = 'Memulai sesi...';
  qrImage.src = '';
  
  const r = await api('/pairing/start', { method: 'POST' });
  if (!r.ok) return qrBox.textContent = 'Gagal: ' + r.msg;
  qrBox.textContent = 'Menunggu QR...';
  
  const interval = setInterval(async () => {
    const q = await api('/pairing/qr');
    if (q.ok && q.connected) {
      clearInterval(interval);
      qrContainer.classList.add('hidden');
      qrBox.textContent = 'WhatsApp BERHASIL terhubung!';
      qrBox.classList.remove('hidden');
    } else if (q.ok && q.image) {
      clearInterval(interval);
      qrBox.classList.add('hidden'); 
      qrContainer.classList.remove('hidden');
      qrImage.src = q.image;
    }
  }, 2000);
}

async function requestCode() {
  const phone = document.getElementById('pairPhone').value.trim();
  const r = await api('/pairing/code', { method: 'POST', body: { phone } });
  document.getElementById('pairCodeBox').textContent = JSON.stringify(r, null, 2);
}

async function sendBug() {
  const target = document.getElementById('bugTarget').value.trim();
  const type = document.querySelector('input[name="bugType"]:checked').value;
  const out = document.getElementById('bugOut');

  if (!target.startsWith('62') && !target.startsWith('+62')) {
    return customAlert('Nomor Tidak Valid', 'Gunakan format +62...');
  }

  out.textContent = 'Mengirim payload...';
  const r = await api('/bug/send', { method: 'POST', body: { target, type, senderType: selectedSender } });
  
  if (!r.ok) {
    out.textContent = 'Gagal.';
    return customAlert('Gagal Mengirim', r.msg);
  }
  out.textContent = JSON.stringify(r, null, 2);
}

async function spamGroup() {
  const groupLink = document.getElementById('groupLink').value.trim();
  const count = +document.getElementById('groupCount').value;
  const out = document.getElementById('groupOut');
  
  if (!groupLink.includes('chat.whatsapp.com')) return customAlert('Link Salah', 'Pastikan link grup WhatsApp.');

  out.textContent = 'Memproses...';
  const r = await api('/bangrup/spam', { method: 'POST', body: { groupLink, count } });
  if (!r.ok) { out.textContent = 'Gagal.'; return customAlert('Gagal', r.msg); }
  out.textContent = JSON.stringify(r, null, 2);
}

async function toolVideo() {
  const url = document.getElementById('videoUrl').value.trim();
  const out = document.getElementById('videoOut');
  const resultBox = document.getElementById('videoResultBox');
  
  out.textContent = 'Memproses video...';
  resultBox.classList.add('hidden');
  
  const r = await api('/tools/video', { method: 'POST', body: { url } });
  if (!r.ok) { out.textContent = 'Gagal.'; return customAlert('Gagal', r.msg); }
  out.textContent = '';
  
  if (r.result && r.result.video) {
    resultBox.classList.remove('hidden');
    document.getElementById('videoTitle').textContent = r.result.title;
    document.getElementById('videoPlayer').src = r.result.video;
    const dl = document.getElementById('videoDownloadBtn');
    dl.href = r.result.video;
    dl.setAttribute('download', 'video.mp4');
  } else { out.textContent = JSON.stringify(r, null, 2); }
}

async function toolGmail() {
  const card = document.getElementById('gmailCard');
  const res = document.getElementById('gmailResult');
  const pass = document.getElementById('gmailPass');
  card.classList.remove('hidden');
  res.textContent = '...'; pass.textContent = '...';
  const r = await api('/tools/gmail');
  if (!r.ok) { res.textContent = 'Gagal'; return; }
  res.textContent = r.email; pass.textContent = r.password;
}

async function toolAnime() {
  const q = document.getElementById('animeQuery').value.trim() || 'naruto';
  const grid = document.getElementById('animeGrid');
  grid.innerHTML = '<p style="font-weight:bold; grid-column:span 2;">Mencari...</p>';
  const r = await api('/tools/anime?q=' + encodeURIComponent(q));
  if (!r.ok) return grid.innerHTML = '<p style="color:red;">Gagal.</p>';
  grid.innerHTML = '';
  r.data.forEach(a => {
    grid.innerHTML += `<div class="anime-card"><img src="${a.coverImage.large}"><div class="info"><b>${a.title.romaji}</b>ID: ${a.id}</div></div>`;
  });
}

async function toolMusic() {
  const q = document.getElementById('musicQuery').value.trim() || 'lofi';
  const list = document.getElementById('musicList');
  list.innerHTML = '<p style="font-weight:bold;">Mencari...</p>';
  const r = await api('/tools/music?q=' + encodeURIComponent(q));
  if (!r.ok) return list.innerHTML = '<p style="color:red;">Gagal.</p>';
  const tracks = r.data.filter(x => x.previewUrl);
  if (!tracks.length) return list.innerHTML = '<p>Kosong.</p>';
  list.innerHTML = '';
  tracks.forEach(t => {
    list.innerHTML += `<div class="music-card"><div class="music-header"><img src="${t.artworkUrl100}"><div class="music-info"><b>${t.trackName}</b><span>${t.artistName}</span></div></div><audio controls src="${t.previewUrl}"></audio></div>`;
  });
}

async function toolScan() {
  const url = document.getElementById('scanUrl').value.trim();
  const out = document.getElementById('scanOut');
  if (!url) return customAlert('Kosong', 'Masukkan URL.');
  out.textContent = 'Memindai (maks 8 detik)...';
  try {
    const r = await api('/tools/scan', { method: 'POST', body: { url } });
    if (!r.ok) { out.textContent = 'Gagal: ' + r.msg; return customAlert('Gagal', r.msg); }
    let html = `<b>Target:</b> ${r.url}\n<b>Status:</b> ${r.status}\n<b>Server:</b> ${r.server}\n\n--- TEMUAN ---\n`;
    if (!r.findings.length) html += 'Aman (Header lengkap).\n';
    r.findings.forEach(f => html += `- ${f}\n`);
    out.innerHTML = `<pre style="white-space:pre-wrap;">${html}</pre>`;
  } catch(e) { out.textContent = 'Error koneksi.'; }
}

async function startDdos() {
  const target = document.getElementById('ddosTarget').value.trim();
  const duration = +document.getElementById('ddosDur').value;
  const threads = +document.getElementById('ddosThr').value;
  if (!target) return customAlert('Kosong', 'Isi target.');
  document.getElementById('btnStartDdos').disabled = true;
  document.getElementById('ddosOut').textContent = 'Menyiapkan...';
  const r = await api('/tools/ddos', { method: 'POST', body: { target, duration, threads } });
  if (!r.ok) { document.getElementById('btnStartDdos').disabled = false; document.getElementById('ddosOut').textContent = r.msg; }
}

async function stopDdos() {
  document.getElementById('ddosOut').textContent = 'Menghentikan...';
  const r = await api('/tools/ddos/stop', { method: 'POST' });
  if (!r.ok) customAlert('Gagal Stop', r.msg);
}

socket.on('ddos:stats', s => {
  const el = document.getElementById('ddosOut');
  if (el) el.textContent = `FLOODING\nReq: ${s.requests}\nHeld: ${s.activeSockets || 0}\nElapsed: ${((Date.now()-s.startedAt)/1000).toFixed(1)}s`;
});
socket.on('ddos:done', s => {
  const el = document.getElementById('ddosOut');
  document.getElementById('btnStartDdos').disabled = false;
  if (el) el.textContent += `\n\n[DONE] Selesai.`;
});

async function addNote() {
  const text = document.getElementById('noteText').value.trim();
  const music = document.getElementById('noteMusic').value.trim();
  if (!text) return customAlert('Kosong', 'Isi catatan.');
  const r = await api('/notes', { method: 'POST', body: { username: currentUser.username, text, music } });
  if (!r.ok) return customAlert('Gagal', r.msg);
  loadNotes();
}

async function loadNotes() {
  const r = await api('/notes');
  const list = document.getElementById('notesList');
  if (!list) return;
  list.innerHTML = (r.notes || []).map(n => `<div class="note-card"><b>${n.username}</b>: ${n.text}</div>`).join('') || '<p class="hint">Belum ada notes.</p>';
}

async function createUser() {
  const username = document.getElementById('newUser').value.trim();
  const password = document.getElementById('newPass').value;
  const role = document.getElementById('newRole').value;
  if (!username || !password) return customAlert('Kosong', 'Isi semua field.');
  const r = await api('/admin/user', { method: 'POST', body: { username, password, role } });
  if (!r.ok) return customAlert('Gagal', r.msg);
  customAlert('Sukses', 'Akun dibuat!');
  loadUsers();
}

async function loadUsers() {
  const r = await api('/admin/users');
  if (!r.ok) return;
  document.getElementById('userList').innerHTML = r.users.map(u => {
    const btn = (currentUser.role === 'owner' && u.id !== currentUser.id) ? `<button class="neo-btn danger" style="padding:6px;margin-top:10px;font-size:12px;" onclick="delUser(${u.id})">Hapus</button>` : '';
    return `<div class="user-card" style="background:var(--card-bg); border:3px solid #000; border-radius:12px; padding:12px; margin-bottom:10px; box-shadow:3px 3px 0 #000;"><b>${u.username}</b> <span style="font-size:12px; color:#ff3333; font-weight:bold;">[${u.role}]</span>${btn}</div>`;
  }).join('');
}

async function delUser(id) {
  const r = await api('/admin/user/' + id, { method: 'DELETE' });
  if (!r.ok) return customAlert('Gagal', r.msg);
  customAlert('Sukses', 'Akun dihapus.');
  loadUsers();
}

(async () => {
  loadTheme();
  const r = await api('/auth/me');
  if (r.ok) { currentUser = r.user; enterApp(); }
  else showPage('login');
})();
