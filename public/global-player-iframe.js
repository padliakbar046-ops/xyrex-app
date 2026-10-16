// XYREX Global Player v5 - persistent via iframe
(function() {
  console.log('[XYP v5] Init');

  function injectIframe() {
    if (document.getElementById('xypIframe')) return;
    var iframe = document.createElement('iframe');
    iframe.id = 'xypIframe';
    iframe.src = '/player-persistent.html';
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden;';
    iframe.setAttribute('allow', 'autoplay');
    document.body.appendChild(iframe);
    console.log('[XYP v5] Iframe injected');
  }

  function stopAllAudio() {
    // Stop audio di halaman utama (kalau ada)
    document.querySelectorAll('audio').forEach(function(a) {
      try { a.pause(); a.src = ''; } catch (e) {}
    });
    // Kirim sinyal ke iframe biar stop juga
    var iframe = document.getElementById('xypIframe');
    if (iframe && iframe.contentWindow) {
      try { iframe.contentWindow.postMessage({ type: 'stop' }, '*'); } catch (e) {}
    }
  }

  function boot() {
    var raw = localStorage.getItem('xyrex_player');
    // Siapkan iframe selalu
    injectIframe();

    // Hapus bar lama kalau ada
    var oldBar = document.getElementById('xypBar');
    if (oldBar) oldBar.remove();

    // Kalau tidak ada state, keluar
    if (!raw) { console.log('[XYP v5] no state'); return; }

    var state;
    try { state = JSON.parse(raw); } catch (e) { return; }
    if (!state || !state.url) return;

    // Cek owner
    var currentUser = localStorage.getItem('xyrex_user') || '';
    if (state.owner && state.owner !== currentUser) {
      console.log('[XYP v5] beda user, clear');
      localStorage.removeItem('xyrex_player');
      return;
    }

    // Cek umur state
    var age = Date.now() - (state.savedAt || 0);
    if (age > 12 * 60 * 60 * 1000) {
      localStorage.removeItem('xyrex_player');
      return;
    }

    console.log('[XYP v5] restore:', state.title);

    // Inject CSS
    if (!document.getElementById('xyp-style')) {
      var s = document.createElement('style');
      s.id = 'xyp-style';
      s.textContent = '.xyp-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:3px solid #0a0a0a;padding:10px 14px;display:flex;align-items:center;gap:12px;z-index:99999;box-shadow:0 -4px 12px rgba(0,0,0,0.15);}' +
        '.xyp-bar .xyp-cover{width:48px;height:48px;border-radius:10px;border:2px solid #0a0a0a;object-fit:cover;background:#1db954;flex-shrink:0;}' +
        '.xyp-bar .xyp-meta{flex:1;min-width:0;}' +
        '.xyp-bar .xyp-title{font-size:12px;font-weight:800;color:#0a1a3a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
        '.xyp-bar .xyp-artist{font-size:10px;color:#4a5a7a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
        '.xyp-bar .xyp-btn{background:#1db954;color:#fff;border:2px solid #0a0a0a;border-radius:10px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;box-shadow:2px 2px 0 #0a0a0a;padding:0;}' +
        '.xyp-bar .xyp-btn:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #0a0a0a;}' +
        '.xyp-bar .xyp-close{background:#b00020;}' +
        'body{padding-bottom:80px !important;}';
      document.head.appendChild(s);
    }

    var bar = document.createElement('div');
    bar.className = 'xyp-bar';
    bar.id = 'xypBar';
    bar.innerHTML = '<img class="xyp-cover" id="xypCover" src="' + (state.artwork || '') + '" onerror="this.style.background=\'#1db954\'">' +
      '<div class="xyp-meta"><div class="xyp-title" id="xypTitle">' + (state.title || '-') + '</div>' +
      '<div class="xyp-artist" id="xypArtist">' + (state.artist || '-') + '</div></div>' +
      '<button class="xyp-btn" id="xypToggle"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>' +
      '<button class="xyp-btn xyp-close" id="xypClose"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
    document.body.appendChild(bar);

    function updateIcon() {
      var ic = document.getElementById('xypToggle');
      if (!ic) return;
      var st = {};
      try { st = JSON.parse(localStorage.getItem('xyrex_player') || '{}'); } catch (e) {}
      if (st.playing) {
        ic.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      } else {
        ic.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      }
    }
    updateIcon();
    setInterval(updateIcon, 800);

    // Toggle play/pause
    document.getElementById('xypToggle').onclick = function() {
      var st = {};
      try { st = JSON.parse(localStorage.getItem('xyrex_player') || '{}'); } catch (e) {}
      st.playing = !st.playing;
      st.savedAt = Date.now();
      localStorage.setItem('xyrex_player', JSON.stringify(st));
      setTimeout(updateIcon, 300);
    };

    // ===== TOMBOL X - STOP TOTAL 1 KLIK =====
    document.getElementById('xypClose').onclick = function() {
      console.log('[XYP v5] Close clicked');
      // 1. Hapus state dulu
      localStorage.removeItem('xyrex_player');
      // 2. Stop semua audio di halaman
      stopAllAudio();
      // 3. Hapus bar dari DOM
      var b = document.getElementById('xypBar');
      if (b) b.remove();
      // 4. Reset padding body
      document.body.style.paddingBottom = '';
      // 5. Toast info
      if (window.xyrexToast) window.xyrexToast('Musik dihentikan', 'success');
    };
  }

  // Dengarkan pindah halaman: kalau halaman direload, cleanup dulu
  window.addEventListener('pagehide', function() {
    // Biarkan saja, iframe akan restore dari localStorage
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
