const $ = id => document.getElementById(id);
const els = {
  messages: $('messages'), input: $('input'), send: $('send'),
  newChat: $('newChat'), history: $('history'), status: $('status'),
  modelLabel: $('modelLabel'), sidebar: $('sidebar'),
  toggleSidebar: $('toggleSidebar'), openSettings: $('openSettings'),
  closeSettings: $('closeSettings'), saveSettings: $('saveSettings'),
  settingsModal: $('settingsModal'), apiKey: $('apiKey'),
  baseUrl: $('baseUrl'), modelInput: $('modelInput')
};

let state = {
  chats: JSON.parse(localStorage.getItem('xyrex_chats') || '[]'),
  currentId: null,
  streaming: false,
  config: JSON.parse(localStorage.getItem('xyrex_config') || '{}')
};

function saveChats(){ localStorage.setItem('xyrex_chats', JSON.stringify(state.chats)); }
function saveConfig(){ localStorage.setItem('xyrex_config', JSON.stringify(state.config)); }
function currentChat(){ return state.chats.find(c => c.id === state.currentId); }
function isMobile(){ return window.innerWidth <= 768; }

function closeSidebar(){ els.sidebar.classList.remove('open'); }

function newChat(){
  const chat = { id: Date.now().toString(), title: 'New Chat', messages: [] };
  state.chats.unshift(chat);
  state.currentId = chat.id;
  saveChats(); renderHistory(); renderMessages();
  if(isMobile()) closeSidebar();
  els.input.focus();
}

function loadChat(id){
  state.currentId = id;
  renderHistory(); renderMessages();
  if(isMobile()) closeSidebar();
}

function renderHistory(){
  els.history.innerHTML = '';
  state.chats.forEach(c => {
    const d = document.createElement('div');
    d.className = 'history-item' + (c.id === state.currentId ? ' active' : '');
    d.textContent = c.title;
    d.onclick = () => loadChat(c.id);
    els.history.appendChild(d);
  });
}

function renderMessages(){
  const chat = currentChat();
  els.messages.innerHTML = '';
  if(!chat || chat.messages.length === 0){
    els.messages.innerHTML = '<div style="text-align:center;color:var(--muted);padding:60px 20px;font-size:13px;font-family:inherit">XYREX siap. kirim perintah apa saja.</div>';
    return;
  }
  chat.messages.forEach(m => appendMessage(m.role, m.content, false));
  els.messages.scrollTop = els.messages.scrollHeight;
}

function appendMessage(role, content, scroll=true){
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + (role === 'user' ? 'user' : 'ai');
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = role === 'user' ? 'U' : 'X';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  if(role === 'user'){
    bubble.textContent = content;
  } else {
    bubble.innerHTML = marked.parse(content || '');
    bubble.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
  }
  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  els.messages.appendChild(wrap);
  if(scroll) els.messages.scrollTop = els.messages.scrollHeight;
  return bubble;
}

function setStatus(text, active){
  els.status.textContent = text;
  els.status.classList.toggle('active', !!active);
}

function showToast(msg, dur=3000){
  let t = $('xyrex-toast');
  if(!t){
    t = document.createElement('div');
    t.id = 'xyrex-toast';
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#0b0d0e;border:1px solid #ffb000;color:#ffb000;padding:8px 14px;font-size:11px;font-family:inherit;letter-spacing:.5px;z-index:200;max-width:90%;text-align:center;pointer-events:none;transition:opacity .3s';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => { t.style.opacity = '0'; }, dur);
}

async function sendMessage(){
  const text = els.input.value.trim();
  if(!text || state.streaming) return;
  if(!state.config.apiKey){
    openSettings();
    showToast('isi API key dulu di settings');
    return;
  }
  let chat = currentChat();
  if(!chat) { newChat(); chat = currentChat(); }

  chat.messages.push({ role: 'user', content: text });
  if(chat.messages.length === 1){
    chat.title = text.slice(0, 40);
    renderHistory();
  }
  saveChats();
  appendMessage('user', text);
  els.input.value = '';
  els.input.style.height = 'auto';

  const bubble = appendMessage('ai', '');
  let acc = '';
  state.streaming = true;
  els.send.disabled = true;
  setStatus('streaming', true);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: state.config.apiKey,
        base_url: state.config.baseUrl || 'https://openrouter.ai/api/v1',
        model: state.config.model || 'meta-llama/llama-3.3-70b-instruct:free',
        messages: chat.messages,
        auto_fallback: true
      })
    });

    if(!res.ok){
      const err = await res.json().catch(()=>({error:res.statusText}));
      bubble.innerHTML = '<span style="color:#ff4d4d">error: ' + (err.error||'unknown') + '</span>';
      state.streaming = false; els.send.disabled = false; setStatus('idle', false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let switched = false;

    while(true){
      const { done, value } = await reader.read();
      if(done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for(const line of lines){
        if(!line.startsWith('data: ')) continue;
        const payload = line.slice(6);
        if(payload === '[DONE]') continue;
        try{
          const obj = JSON.parse(payload);
          if(obj.model_switch){
            switched = true;
            state.config.model = obj.model_switch;
            saveConfig();
            els.modelLabel.textContent = obj.model_switch;
            showToast('model auto-switch: ' + obj.model_switch, 4000);
          } else if(obj.error){
            acc += '\n[error: ' + obj.error + ']';
          } else if(obj.token){
            acc += obj.token;
          }
          bubble.innerHTML = marked.parse(acc);
          bubble.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
          els.messages.scrollTop = els.messages.scrollHeight;
        }catch(e){}
      }
    }

    chat.messages.push({ role: 'assistant', content: acc });
    saveChats();
  } catch(e){
    bubble.innerHTML = '<span style="color:#ff4d4d">error: ' + e.message + '</span>';
  }

  state.streaming = false;
  els.send.disabled = false;
  setStatus('idle', false);
}

function openSettings(){
  els.apiKey.value = state.config.apiKey || '';
  els.baseUrl.value = state.config.baseUrl || 'https://openrouter.ai/api/v1';
  els.modelInput.value = state.config.model || 'meta-llama/llama-3.3-70b-instruct:free';
  els.settingsModal.classList.remove('hidden');
}
function closeSettings(){ els.settingsModal.classList.add('hidden'); }

function applyConfig(){
  state.config = {
    apiKey: els.apiKey.value.trim(),
    baseUrl: els.baseUrl.value.trim(),
    model: els.modelInput.value.trim()
  };
  saveConfig();
  els.modelLabel.textContent = state.config.model || 'no model';
  closeSettings();
  showToast('settings tersimpan');
}

// ===== Event bindings =====
els.send.onclick = sendMessage;
els.input.addEventListener('keydown', e => {
  if(e.key === 'Enter' && !e.shiftKey && !isMobile()){ e.preventDefault(); sendMessage(); }
});
els.input.addEventListener('input', () => {
  els.input.style.height = 'auto';
  els.input.style.height = Math.min(els.input.scrollHeight, 160) + 'px';
});
els.newChat.onclick = newChat;
els.openSettings.onclick = openSettings;
els.closeSettings.onclick = closeSettings;
els.saveSettings.onclick = applyConfig;

els.toggleSidebar.onclick = () => {
  els.sidebar.classList.toggle('open');
};

// Klik area kosong di kanan sidebar (mobile) untuk close
document.addEventListener('click', (e) => {
  if(!isMobile()) return;
  if(!els.sidebar.classList.contains('open')) return;
  if(els.sidebar.contains(e.target)) return;
  if(els.toggleSidebar.contains(e.target)) return;
  closeSidebar();
});

// Escape key untuk close sidebar / modal
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape'){
    closeSidebar();
    closeSettings();
  }
});

// Swipe dari kiri untuk buka sidebar di mobile
let touchStartX = 0;
document.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if(!isMobile()) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if(touchStartX < 30 && dx > 60){
    els.sidebar.classList.add('open');
  }
  if(dx < -60 && els.sidebar.classList.contains('open')){
    closeSidebar();
  }
}, { passive: true });

// Init
els.modelLabel.textContent = state.config.model || 'no model';
renderHistory();
if(state.chats.length === 0) newChat();
else { state.currentId = state.chats[0].id; renderHistory(); renderMessages(); }
