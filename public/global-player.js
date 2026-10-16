// XYREX Global Music Player v3 - clean
(function() {
  console.log('[XYP v3] load');

  function boot() {
    var raw = localStorage.getItem('xyrex_player');
    if (!raw) { console.log('[XYP v3] no state'); return; }
    var state;
    try { state = JSON.parse(raw); } catch (e) { return; }
    if (!state || !state.url) return;

    // Cek owner: hanya tampilkan kalau user login SAMA dengan yang memilih lagu
    var currentUser = localStorage.getItem('xyrex_user') || '';

    // Cek umur state (max 12 jam)
    var stateAge = Date.now() - (state.savedAt || 0);
    if (stateAge > 12 * 60 * 60 * 1000) {
      console.log('[XYP] state expired, hapus');
      localStorage.removeItem('xyrex_player');
      return;
    }
    if (state.owner && state.owner !== currentUser) {
      console.log('[XYP v3] beda user, skip. owner:', state.owner, 'current:', currentUser);
      // Hapus state biar tidak numpuk
      localStorage.removeItem('xyrex_player');
      return;
    }

    console.log('[XYP v3] restore:', state.title);

    // Hapus semua elemen player lama
    document.querySelectorAll('.xyp-bar, #xypBar, #xypAudio').forEach(function(el) { el.remove(); });

    // CSS
    if (!document.getElementById('xyp-style')) {
      var s = document.createElement('style');
      s.id = 'xyp-style';
      s.textContent = [
        '.xyp-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:3px solid #0a0a0a;padding:10px 14px;display:flex;align-items:center;gap:12px;z-index:99999;box-shadow:0 -4px 12px rgba(0,0,0,0.15);}',
        '.xyp-bar .xyp-cover{width:48px;height:48px;border-radius:10px;border:2px solid #0a0a0a;object-fit:cover;background:#1db954;flex-shrink:0;}',
        '.xyp-bar .xyp-meta{flex:1;min-width:0;}',
        '.xyp-bar .xyp-title{font-size:12px;font-weight:800;color:#0a1a3a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
        '.xyp-bar .xyp-artist{font-size:10px;color:#4a5a7a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
        '.xyp-bar .xyp-btn{background:#1db954;color:#fff;border:2px solid #0a0a0a;border-radius:10px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;box-shadow:2px 2px 0 #0a0a0a;padding:0;}',
        '.xyp-bar .xyp-btn:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #0a0a0a;}',
        '.xyp-bar .xyp-close{background:#b00020;}',
        'body{padding-bottom:80px !important;}'
      ].join('');
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

    var audio = document.createElement('audio');
    audio.id = 'xypAudio';
    audio.src = state.url;
    audio.currentTime = state.time || 0;
    audio.style.display = 'none';
    document.body.appendChild(audio);

    if (state.playing) audio.play().catch(function(e) { console.log('autoplay blocked'); });

    function updateIcon() {
      var ic = document.getElementById('xypToggle');
      if (!ic) return;
      if (audio.paused) {
        ic.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      } else {
        ic.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      }
    }
    audio.onplay = updateIcon;
    audio.onpause = updateIcon;
    setTimeout(updateIcon, 200);

    document.getElementById('xypToggle').onclick = function() {
      if (audio.paused) audio.play(); else audio.pause();
    };

    document.getElementById('xypClose').onclick = function() {
      try { audio.pause(); } catch (e) {}
      audio.src = '';
      localStorage.removeItem('xyrex_player');
      var b = document.getElementById('xypBar');
      if (b) b.remove();
      var a = document.getElementById('xypAudio');
      if (a) a.remove();
      console.log('[XYP v3] closed');
    };

    setInterval(function() {
      if (!audio.src) return;
      try {
        localStorage.setItem('xyrex_player', JSON.stringify({
          url: audio.src,
          title: state.title,
          artist: state.artist,
          artwork: state.artwork,
          time: audio.currentTime,
          playing: !audio.paused,
          owner: state.owner
        }));
      } catch (e) {}
    }, 1000);

    window.addEventListener('beforeunload', function() {
      if (!audio.src) return;
      try {
        localStorage.setItem('xyrex_player', JSON.stringify({
          url: audio.src,
          title: state.title,
          artist: state.artist,
          artwork: state.artwork,
          time: audio.currentTime,
          playing: !audio.paused,
          owner: state.owner
        }));
      } catch (e) {}
    });
  }

  window.XYP_REFRESH = function() {
    // Hapus player lama
    var oldBar = document.getElementById('xypBar');
    if (oldBar) oldBar.remove();
    var oldAudio = document.getElementById('xypAudio');
    if (oldAudio) oldAudio.remove();
    // Boot ulang dengan state baru
    boot();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
