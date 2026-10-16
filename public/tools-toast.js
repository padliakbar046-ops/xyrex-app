// XYREX Tools - Toast Notification
(function() {
  // Inject CSS sekali
  if (!document.getElementById('xyrex-toast-style')) {
    const style = document.createElement('style');
    style.id = 'xyrex-toast-style';
    style.textContent = `
      .xyrex-toast-wrap {
        position: fixed;
        top: 16px;
        left: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        z-index: 99999;
        pointer-events: none;
        padding: 0 16px;
      }
      .xyrex-toast {
        background: #1a1a1a;
        border: 2px solid #6a4fff;
        border-radius: 14px;
        padding: 14px 18px;
        box-shadow: 0 6px 24px rgba(106,79,255,0.35);
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 360px;
        width: 100%;
        pointer-events: auto;
        animation: xyToastSlide 0.3s ease;
      }
      .xyrex-toast.error { border-color: #ff4f6a; box-shadow: 0 6px 24px rgba(255,79,106,0.4); }
      .xyrex-toast.success { border-color: #25d366; box-shadow: 0 6px 24px rgba(37,211,102,0.4); }
      .xyrex-toast.info { border-color: #6a4fff; }
      .xyrex-toast .toast-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #a78bfa;
        flex-shrink: 0;
        box-shadow: 0 0 8px #a78bfa;
      }
      .xyrex-toast.error .toast-dot { background: #ff8fa3; box-shadow: 0 0 8px #ff8fa3; }
      .xyrex-toast.success .toast-dot { background: #7dffaa; box-shadow: 0 0 8px #7dffaa; }
      .xyrex-toast .toast-msg {
        color: #ffffff;
        font-size: 13px;
        font-weight: 700;
        flex: 1;
        line-height: 1.4;
      }
      .xyrex-toast .toast-close {
        background: transparent;
        border: none;
        color: #a8a8a8;
        font-size: 22px;
        cursor: pointer;
        padding: 0 4px;
        flex-shrink: 0;
      }
      @keyframes xyToastSlide {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureWrap() {
    let wrap = document.getElementById('xyrexToastWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'xyrexToastWrap';
      wrap.className = 'xyrex-toast-wrap';
      document.body.appendChild(wrap);
    }
    return wrap;
  }

  window.xyrexToast = function(msg, type = 'error') {
    const wrap = ensureWrap();
    const el = document.createElement('div');
    el.className = 'xyrex-toast ' + type;
    el.innerHTML = '<div class="toast-dot"></div><div class="toast-msg"></div><button class="toast-close">×</button>';
    el.querySelector('.toast-msg').textContent = msg;
    el.querySelector('.toast-close').onclick = () => el.remove();
    wrap.appendChild(el);
    setTimeout(() => { if (el.parentElement) el.remove(); }, 3500);
  };

  // Override alert globally untuk halaman tools
  const origAlert = window.alert;
  window.alert = function(msg) {
    window.xyrexToast(String(msg), 'error');
  };
})();
