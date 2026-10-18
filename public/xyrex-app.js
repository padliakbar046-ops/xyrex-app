document.addEventListener('DOMContentLoaded', () => {
  const mainContent = document.getElementById('main-content');
  const userBadge = document.getElementById('user-badge');

  // Tangkap token dari URL
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');
  
  if (tokenFromUrl) {
    localStorage.setItem('token', tokenFromUrl);
    localStorage.setItem('session', tokenFromUrl);
    localStorage.setItem('role', 'owner');
    window.history.replaceState({}, document.title, "/");
  }

  const token = localStorage.getItem('token');
  const isLoginPage = window.location.pathname === '/log' || window.location.pathname === '/login';

  if (!token && !isLoginPage) {
    window.location.href = '/log';
    return;
  }

  if (token && isLoginPage) {
    window.location.href = '/';
    return;
  }

  // --- HALAMAN LOGIN ---
  if (!token) {
    mainContent.innerHTML = `
      <div class="card" style="text-align:center;">
        <h2 style="margin-top:0; color:#0b1a3a; display:flex; align-items:center; justify-content:center; gap:10px;">
          <span style="color:#2b7be4;">➜]</span> Login XYREX
        </h2>
        <div id="login-error" class="error-box">Username atau password salah!</div>
        
        <div class="input-group" style="text-align:left;">
          <label>Username</label>
          <input type="text" id="x-user" value="Dlizz">
        </div>
        
        <div class="input-group" style="text-align:left;">
          <label>Password</label>
          <input type="password" id="x-pass" value="20111608">
        </div>
        
        <button id="x-btn" class="btn">LOGIN</button>
      </div>
    `;

    document.getElementById('x-btn').onclick = async (e) => {
      e.preventDefault();
      const btn = e.target;
      const user = document.getElementById('x-user').value;
      const pass = document.getElementById('x-pass').value;
      const errBox = document.getElementById('login-error');

      btn.textContent = 'MEMPROSES...';
      btn.disabled = true;
      errBox.style.display = 'none';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();

        if (data.success || data.status) {
          const tk = data.token || data.session || (data.data && data.data.token);
          localStorage.setItem('token', tk);
          localStorage.setItem('session', tk);
          window.location.href = '/';
        } else {
          throw new Error(data.message || 'Login gagal');
        }
      } catch (err) {
        errBox.textContent = err.message;
        errBox.style.display = 'block';
        btn.textContent = 'LOGIN';
        btn.disabled = false;
      }
    };
    return;
  }

  // --- HALAMAN BERANDA ---
  userBadge.style.display = 'block';
  
  mainContent.innerHTML = `
    <div class="card">
      <h2 style="margin-top:0;">Catatan User</h2>
      <div id="notes-list" style="color:#666; margin-bottom:15px;">Memuat catatan...</div>
      <button class="btn" onclick="document.getElementById('modal-note').style.display='flex'">+ Buat Catatan Baru</button>
    </div>

    <h3 style="color:#0b1a3a;">Fitur Tersedia</h3>
    
    <div class="card" style="padding:0;">
      <div class="menu-item">
        <div class="menu-icon" style="background:#2ecc71;">💬</div>
        <div><b>Chat Public</b><br><small>Obrolan bersama semua user</small></div>
      </div>
      <div class="menu-item">
        <div class="menu-icon" style="background:#3498db;">👤</div>
        <div><b>Pairing Sender</b><br><small>Hubungkan WhatsApp</small></div>
      </div>
      <div class="menu-item">
        <div class="menu-icon" style="background:#e74c3c;">🛠️</div>
        <div><b>Tools</b><br><small>Video, Gmail, Anime, Music</small></div>
      </div>
    </div>

    <button id="btn-logout" class="btn" style="background:#d9534f; margin-top:20px;">LOGOUT</button>

    <!-- MODAL BUAT CATATAN -->
    <div id="modal-note" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); align-items:center; justify-content:center; z-index:999;">
      <div class="card" style="width:90%; max-width:400px;">
        <h3 style="margin-top:0;">Buat Catatan</h3>
        <div class="input-group">
          <label>Teks Catatan (Max 100)</label>
          <input type="text" id="note-text" placeholder="Apa yang mau kamu sampaikan?" maxlength="100">
        </div>
        <button id="btn-save-note" class="btn" style="background:#2ecc71;">SIMPAN</button>
        <button onclick="document.getElementById('modal-note').style.display='none'" class="btn" style="background:#999; margin-top:10px;">BATAL</button>
      </div>
    </div>
  `;

  document.getElementById('btn-logout').onclick = () => {
    localStorage.clear();
    window.location.href = '/log';
  };

  // Fungsi Ambil Catatan
  const loadNotes = async () => {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      const list = document.getElementById('notes-list');
      if (data.success && data.data.length > 0) {
        list.innerHTML = data.data.map(n => `<div style="background:#e0e8f5; padding:10px; border-radius:8px; margin-bottom:5px; font-weight:bold;">${n.text}</div>`).join('');
      } else {
        list.innerHTML = 'Belum ada catatan.';
      }
    } catch(e) { console.error(e); }
  };
  loadNotes();

  // Fungsi Simpan Catatan
  document.getElementById('btn-save-note').onclick = async () => {
    const text = document.getElementById('note-text').value;
    if(!text) return alert('Isi teks!');
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session': localStorage.getItem('session') },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if(data.success) {
        document.getElementById('modal-note').style.display='none';
        document.getElementById('note-text').value = '';
        loadNotes();
      } else { alert(data.error); }
    } catch(e) { alert('Gagal simpan'); }
  };
});
