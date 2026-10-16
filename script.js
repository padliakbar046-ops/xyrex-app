const ICONS = {
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  form: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>',
  layout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
  palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 2a10 10 0 0 0 0 20c1.38 0 2.5-1.12 2.5-2.5 0-.61-.24-1.18-.66-1.6-.42-.42-.66-.99-.66-1.6 0-1.38 1.12-2.5 2.5-2.5H16a6 6 0 0 0 6-6c0-5.52-4.48-10-10-10z"/></svg>',
  ruler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 8.7l-6-6a1 1 0 0 0-1.4 0l-12 12a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0l12-12a1 1 0 0 0 0-1.4z"/><line x1="7.5" y1="10.5" x2="10.5" y2="13.5"/><line x1="10.5" y1="7.5" x2="13.5" y2="10.5"/><line x1="13.5" y1="4.5" x2="16.5" y2="7.5"/></svg>',
  type: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
  flex: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z"/></svg>',
  variable: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1"/></svg>',
  hash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
  branch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>',
  loop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>'
};

const LESSONS = {
  html: [
    { id: 'html-1', icon: 'file', title: 'Tag Dasar HTML', desc: 'Kenalan dengan tag html, head, body', level: 'Pemula', task: 'Buat heading h1 dengan teks "Halo XYREX"', starter: '<h1>Tulis di sini</h1>', check: (c) => c.includes('<h1>') && c.toLowerCase().includes('halo xyrex') },
    { id: 'html-2', icon: 'link', title: 'Link & Navigasi', desc: 'Bikin link ke halaman lain', level: 'Pemula', task: 'Buat link <a> ke https://xyrex.dev dengan teks "Kunjungi"', starter: '<a href="">Tulis di sini</a>', check: (c) => c.includes('<a') && c.includes('href') && c.includes('xyrex') },
    { id: 'html-3', icon: 'list', title: 'List & Struktur', desc: 'Bikin daftar rapi dengan ul dan li', level: 'Pemula', task: 'Buat unordered list <ul> dengan 3 item <li>', starter: '<ul>\n  \n</ul>', check: (c) => (c.match(/<li>/g) || []).length >= 3 },
    { id: 'html-4', icon: 'form', title: 'Form Input', desc: 'Bikin form dengan input text', level: 'Menengah', task: 'Buat <input type="text"> dan <button>Kirim</button>', starter: '<form>\n  \n</form>', check: (c) => c.includes('<input') && c.includes('<button') },
    { id: 'html-5', icon: 'layout', title: 'Div & Span', desc: 'Gunakan div dan span untuk layout', level: 'Menengah', task: 'Buat <div> berisi <span> dengan teks apapun', starter: '<div>\n  \n</div>', check: (c) => c.includes('<div>') && c.includes('<span>') },
  ],
  css: [
    { id: 'css-1', icon: 'palette', title: 'Warna & Background', desc: 'Atur warna teks dan background', level: 'Pemula', task: 'Buat CSS body dengan background hitam dan color putih', starter: 'body {\n  \n}', check: (c) => c.includes('background') && c.includes('color') },
    { id: 'css-2', icon: 'ruler', title: 'Margin & Padding', desc: 'Atur jarak elemen', level: 'Pemula', task: 'Buat class .box dengan padding 20px dan margin 10px', starter: '.box {\n  \n}', check: (c) => c.includes('padding') && c.includes('margin') },
    { id: 'css-3', icon: 'type', title: 'Font & Text', desc: 'Styling huruf dan teks', level: 'Pemula', task: 'Buat h1 dengan font-size 40px dan text-align center', starter: 'h1 {\n  \n}', check: (c) => c.includes('font-size') && c.includes('text-align') },
    { id: 'css-4', icon: 'flex', title: 'Flexbox', desc: 'Layout modern dengan flex', level: 'Menengah', task: 'Buat .container dengan display flex dan justify-content center', starter: '.container {\n  \n}', check: (c) => c.includes('display') && c.includes('flex') && c.includes('justify-content') },
    { id: 'css-5', icon: 'sparkle', title: 'Transisi & Hover', desc: 'Bikin efek interaktif', level: 'Menengah', task: 'Buat .btn dengan transition dan :hover yang ubah background', starter: '.btn {\n  \n}\n\n.btn:hover {\n  \n}', check: (c) => c.includes('transition') && c.includes(':hover') },
  ],
  js: [
    { id: 'js-1', icon: 'variable', title: 'Variabel & Tipe Data', desc: 'Dasar variabel JS', level: 'Pemula', task: 'Buat variabel nama dengan let dan isi string "XYREX"', starter: 'let nama = "";', check: (c) => c.includes('let') && c.toLowerCase().includes('xyrex') },
    { id: 'js-2', icon: 'hash', title: 'Operator & Math', desc: 'Hitung dengan JS', level: 'Pemula', task: 'Buat variabel hasil = 5 + 3', starter: 'let hasil = ;', check: (c) => c.includes('hasil') && c.includes('5') && c.includes('3') },
    { id: 'js-3', icon: 'branch', title: 'If & Else', desc: 'Logika percabangan', level: 'Pemula', task: 'Buat if yang cek angka > 5, else tampilkan "kecil"', starter: 'let angka = 10;\nif () {\n  \n} else {\n  \n}', check: (c) => c.includes('if') && c.includes('else') && c.includes('>') },
    { id: 'js-4', icon: 'loop', title: 'Loop For', desc: 'Ulangi aksi dengan loop', level: 'Menengah', task: 'Buat for loop dari 1 sampai 10', starter: 'for (let i = 1; i <= ; i++) {\n  \n}', check: (c) => c.includes('for') && c.includes('i++') },
    { id: 'js-5', icon: 'box', title: 'Fungsi', desc: 'Bikin function reusable', level: 'Menengah', task: 'Buat function sapa yang return "Halo XYREX"', starter: 'function sapa() {\n  \n}', check: (c) => c.includes('function') && c.toLowerCase().includes('halo') },
  ]
};

let currentLang = 'html';
let currentLesson = null;
let levelFilter = 'all';
let searchQuery = '';

function getProgress() {
  try { return JSON.parse(localStorage.getItem('xyrex_progress') || '{}'); }
  catch { return {}; }
}

function markDone(id) {
  const p = getProgress();
  p[id] = true;
  localStorage.setItem('xyrex_progress', JSON.stringify(p));
}

function isDone(id) { return getProgress()[id] === true; }

function resetProgress() {
  if (confirm('Reset semua progress?')) {
    localStorage.removeItem('xyrex_progress');
    renderLessons();
    updateProgressPage();
    showToast('Progress direset', 'success');
  }
}

function renderLessons() {
  const grid = document.getElementById('lessonGrid');
  const empty = document.getElementById('emptyState');
  if (!grid) return;
  let lessons = LESSONS[currentLang] || [];

  if (levelFilter !== 'all') {
    lessons = lessons.filter(l => l.level === levelFilter);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    lessons = lessons.filter(l =>
      l.title.toLowerCase().includes(q) ||
      l.desc.toLowerCase().includes(q) ||
      l.task.toLowerCase().includes(q)
    );
  }

  if (lessons.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  grid.innerHTML = lessons.map(l => `
    <div class="lesson-card ${isDone(l.id) ? 'done' : ''}" onclick="openLesson('${l.id}')">
      <div class="lesson-icon">${ICONS[l.icon] || ICONS.file}</div>
      <div class="lesson-title">${l.title}</div>
      <div class="lesson-desc">${l.desc}</div>
      <div class="lesson-level">${l.level}</div>
    </div>
  `).join('');
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast ' + type;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

function goSection(e, id) {
  if (e) e.preventDefault();
  closeAllSubpages();
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function goHome(e) {
  if (e) e.preventDefault();
  closeAllSubpages();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeAllSubpages() {
  document.querySelectorAll('.subpage').forEach(p => p.classList.remove('active'));
  document.body.style.overflow = '';
}

function openLesson(id) {
  const allLessons = Object.values(LESSONS).flat();
  const lesson = allLessons.find(l => l.id === id);
  if (!lesson) return;
  currentLesson = lesson;

  const content = document.getElementById('lessonContent');
  content.innerHTML = `
    <div class="lesson-content">
      <h2>${lesson.title}</h2>
      <p>${lesson.desc}</p>
      <div class="lesson-task"><strong>Tugas:</strong> ${lesson.task}</div>
    </div>
  `;

  const crumb = document.getElementById('crumbLesson');
  if (crumb) crumb.textContent = lesson.title;

  document.getElementById('lessonEditor').value = lesson.starter;
  const feedback = document.getElementById('feedback');
  feedback.className = 'feedback';
  feedback.textContent = '';

  document.querySelectorAll('.subpage').forEach(p => p.classList.remove('active'));
  document.getElementById('lessonPage').classList.add('active');
  document.body.style.overflow = 'hidden';

  updateLessonPreview();
}

function updateLessonPreview() {
  const code = document.getElementById('lessonEditor').value;
  const frame = document.getElementById('lessonPreview');
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open(); doc.write(code); doc.close();
}

function checkAnswer() {
  if (!currentLesson) return;
  const code = document.getElementById('lessonEditor').value;
  const feedback = document.getElementById('feedback');
  if (currentLesson.check(code)) {
    feedback.className = 'feedback success';
    feedback.textContent = 'Mantap! Jawaban kamu benar.';
    markDone(currentLesson.id);
    renderLessons();
    showToast('Pelajaran selesai!', 'success');
  } else {
    feedback.className = 'feedback error';
    feedback.textContent = 'Belum tepat. Coba cek lagi tugasnya.';
  }
}

function openProgress() {
  updateProgressPage();
  document.querySelectorAll('.subpage').forEach(p => p.classList.remove('active'));
  document.getElementById('progressPage').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function updateProgressPage() {
  const allLessons = Object.values(LESSONS).flat();
  const done = allLessons.filter(l => isDone(l.id)).length;
  const total = allLessons.length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  const sd = document.getElementById('statDone');
  const st = document.getElementById('statTotal');
  const sp = document.getElementById('statPercent');
  const pb = document.getElementById('progressBar');

  if (sd) sd.textContent = done;
  if (st) st.textContent = total;
  if (sp) sp.textContent = percent + '%';
  if (pb) pb.style.width = percent + '%';

  const list = document.getElementById('progressListFull');
  if (!list) return;

  list.innerHTML = ['html', 'css', 'js'].map(lang => {
    const lessons = LESSONS[lang];
    return `
      <div style="grid-column:1/-1; margin-top:14px; font-weight:700; color:var(--accent-2); font-size:0.95em; text-transform:uppercase; letter-spacing:1px;">
        ${lang.toUpperCase()}
      </div>
      ${lessons.map(l => `
        <div class="progress-item ${isDone(l.id) ? 'done' : ''}">
          <div class="progress-item-title">
            <span style="width:18px;height:18px;display:inline-flex;color:var(--accent-2)">${ICONS[l.icon] || ''}</span>
            ${l.title}
          </div>
          <div class="progress-item-status">${isDone(l.id) ? 'Selesai' : 'Belum'}</div>
        </div>
      `).join('')}
    `;
  }).join('');
}

function openSearch() {
  document.getElementById('searchOverlay').classList.add('active');
  setTimeout(() => document.getElementById('searchOverlayInput').focus(), 50);
}

function closeSearch() {
  document.getElementById('searchOverlay').classList.remove('active');
  document.getElementById('searchOverlayInput').value = '';
  document.getElementById('searchResults').innerHTML = '';
}

function performSearch(q) {
  const results = document.getElementById('searchResults');
  if (!q.trim()) {
    results.innerHTML = '';
    return;
  }
  const query = q.toLowerCase();
  const allLessons = [];
  for (const lang of ['html', 'css', 'js']) {
    LESSONS[lang].forEach(l => allLessons.push({ ...l, lang }));
  }
  const matches = allLessons.filter(l =>
    l.title.toLowerCase().includes(query) ||
    l.desc.toLowerCase().includes(query) ||
    l.task.toLowerCase().includes(query)
  );

  if (matches.length === 0) {
    results.innerHTML = '<div class="search-empty">Tidak ada hasil untuk "' + q + '"</div>';
    return;
  }

  results.innerHTML = matches.map(l => `
    <div class="search-result" onclick="closeSearch(); openLesson('${l.id}')">
      <div class="search-result-title">${l.title}</div>
      <div class="search-result-meta">${l.lang.toUpperCase()} • ${l.level} • ${l.desc}</div>
    </div>
  `).join('');
}

// ============= EVENT LISTENERS =============
document.addEventListener('DOMContentLoaded', () => {
  // Tabs bahasa
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentLang = tab.dataset.lang;
      renderLessons();
    });
  });

  // Filter level
  const levelSel = document.getElementById('levelFilter');
  if (levelSel) {
    levelSel.addEventListener('change', (e) => {
      levelFilter = e.target.value;
      renderLessons();
    });
  }

  // Search inline
  const searchInline = document.getElementById('searchInput');
  if (searchInline) {
    searchInline.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderLessons();
    });
  }

  // Playground run
  const runBtn = document.getElementById('runBtn');
  if (runBtn) {
    runBtn.addEventListener('click', () => {
      const code = document.getElementById('codeEditor').value;
      const frame = document.getElementById('preview');
      const doc = frame.contentDocument || frame.contentWindow.document;
      doc.open(); doc.write(code); doc.close();
    });
  }

  // Playground clear
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      document.getElementById('codeEditor').value = '';
      const frame = document.getElementById('preview');
      const doc = frame.contentDocument || frame.contentWindow.document;
      doc.open(); doc.write(''); doc.close();
    });
  }

  // Lesson editor input
  const lessonEditor = document.getElementById('lessonEditor');
  if (lessonEditor) lessonEditor.addEventListener('input', updateLessonPreview);

  // Check answer
  const checkBtn = document.getElementById('checkBtn');
  if (checkBtn) checkBtn.addEventListener('click', checkAnswer);

  // Progress button
  const progressBtn = document.getElementById('progressBtn');
  if (progressBtn) progressBtn.addEventListener('click', openProgress);

  // Search button
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) searchBtn.addEventListener('click', openSearch);

  // Search overlay input
  const searchOverlayInput = document.getElementById('searchOverlayInput');
  if (searchOverlayInput) {
    searchOverlayInput.addEventListener('input', (e) => performSearch(e.target.value));
  }

  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const html = document.documentElement;
      html.dataset.theme = html.dataset.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('xyrex_theme', html.dataset.theme);
    });
    // Restore theme
    const savedTheme = localStorage.getItem('xyrex_theme');
    if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  }

  // ESC untuk close search
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearch();
    // Ctrl+K untuk search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  });

  // Auto-run playground pertama kali
  setTimeout(() => {
    const rb = document.getElementById('runBtn');
    if (rb) rb.click();
  }, 150);

  // Init lesson grid
  renderLessons();
});

// ============= WARNING SCREEN =============
function enterApp() {
  const ws = document.getElementById('warningScreen');
  const app = document.getElementById('appRoot');
  ws.classList.add('hide');
  setTimeout(() => {
    ws.style.display = 'none';
    app.style.display = 'block';
    document.body.style.overflow = '';
    showToast('Selamat datang di XYREX', 'success');
    // Auto-run playground
    setTimeout(() => {
      const rb = document.getElementById('runBtn');
      if (rb) rb.click();
    }, 200);
  }, 350);
}

function showAboutFromWarning() {
  enterApp();
  setTimeout(() => {
    const el = document.getElementById('about');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, 500);
}

// ============= TOAST WITH ICON =============
const TOAST_ICONS = {
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
};

function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  const icon = document.getElementById('toastIcon');
  const text = document.getElementById('toastText');
  if (!t) return;

  icon.innerHTML = TOAST_ICONS[type] || TOAST_ICONS.info;
  text.textContent = msg;
  t.className = 'toast ' + type;
  // Force reflow
  void t.offsetWidth;
  t.classList.add('show');

  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ============= CONFIRM MODAL =============
let confirmCallback = null;

function openConfirm(title, desc, callback) {
  const modal = document.getElementById('confirmModal');
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmDesc').textContent = desc;
  confirmCallback = callback;
  modal.classList.add('active');
}

function closeConfirm() {
  document.getElementById('confirmModal').classList.remove('active');
  confirmCallback = null;
}

function confirmOk() {
  const cb = confirmCallback;
  closeConfirm();
  if (typeof cb === 'function') cb();
}

function confirmReset() {
  openConfirm(
    'Reset Progress?',
    'Semua progress belajar kamu akan dihapus. Tindakan ini tidak bisa dibatalkan.',
    () => {
      localStorage.removeItem('xyrex_progress');
      renderLessons();
      updateProgressPage();
      showToast('Progress berhasil direset', 'success');
    }
  );
}

// Override resetProgress lama
function resetProgress() { confirmReset(); }

// ============= SUCCESS MODAL =============
function openSuccess(desc) {
  document.getElementById('successDesc').textContent = desc || 'Kamu berhasil menyelesaikan pelajaran ini.';
  document.getElementById('successModal').classList.add('active');
}

function closeSuccess() {
  document.getElementById('successModal').classList.remove('active');
}

// Update checkAnswer untuk pakai success modal
function checkAnswerV2() {
  if (!currentLesson) return;

  const btn = document.getElementById('checkBtn');
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 0.8s linear infinite"><circle cx="12" cy="12" r="10" stroke-dasharray="30 100"/></svg> Cek...';
  btn.disabled = true;

  setTimeout(() => {
    const code = document.getElementById('lessonEditor').value;
    const feedback = document.getElementById('feedback');

    if (currentLesson.check(code)) {
      feedback.className = 'feedback success';
      feedback.textContent = 'Mantap! Jawaban kamu benar.';
      markDone(currentLesson.id);
      renderLessons();
      openSuccess('Selamat! Kamu berhasil menyelesaikan "' + currentLesson.title + '".');
    } else {
      feedback.className = 'feedback error';
      feedback.textContent = 'Belum tepat. Coba cek lagi tugasnya.';
      showToast('Jawaban belum tepat', 'error');
    }

    btn.innerHTML = originalHTML;
    btn.disabled = false;
  }, 400);
}

// Ganti handler checkBtn lama
document.addEventListener('DOMContentLoaded', () => {
  const checkBtn = document.getElementById('checkBtn');
  if (checkBtn) {
    // Hapus listener lama dengan clone
    const newBtn = checkBtn.cloneNode(true);
    checkBtn.parentNode.replaceChild(newBtn, checkBtn);
    newBtn.addEventListener('click', checkAnswerV2);
  }
});

// ============= SPIN ANIMATION =============
const style = document.createElement('style');
style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(style);
