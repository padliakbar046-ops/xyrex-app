// ==========================================
// GLOBAL LOADING & WEB SCANNER UI - XYREX
// ==========================================

(function() {
    // --- 1. SETUP LOADING OVERLAY (Tetap) ---
    const style = document.createElement('style');
    style.innerHTML = `
        #xyrex-loading-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.4); z-index: 99999; display: none; flex-direction: column; justify-content: center; align-items: center; backdrop-filter: blur(1px); }
        .xyrex-loader-box { background: #fff; border: 3px solid #000; box-shadow: 4px 4px 0px #000; padding: 15px 25px; text-align: center; display: flex; flex-direction: column; align-items: center; border-radius: 8px; animation: popIn 0.2s ease-out; }
        .xyrex-loader-svg { width: 35px; height: 35px; animation: spin 0.8s linear infinite; margin-bottom: 10px; }
        .xyrex-loader-text { font-family: monospace, sans-serif; font-weight: 900; font-size: 13px; color: #000; }
        .xyrex-loader-dots::after { content: ''; animation: dots 1.5s steps(4, end) infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes dots { 0%, 20% { content: ''; } 40% { content: '.'; } 60% { content: '..'; } 80%, 100% { content: '...'; } }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'xyrex-loading-overlay';
    overlay.innerHTML = `<div class="xyrex-loader-box"><svg class="xyrex-loader-svg" viewBox="0 0 50 50" fill="none"><path d="M25 5C13.9543 5 5 13.9543 5 25C5 36.0457 13.9543 45 25 45C36.0457 45 45 36.0457 45 25" stroke="#000" stroke-width="6" stroke-linecap="round"/><circle cx="25" cy="25" r="8" fill="#ff0055"/></svg><div class="xyrex-loader-text">Memproses<span class="xyrex-loader-dots"></span></div></div>`;
    document.body.appendChild(overlay);

    window.showLoading = function() { overlay.style.display = 'flex'; };
    window.hideLoading = function() { overlay.style.display = 'none'; };

    // --- 2. WEB SCANNER LOGIC (UI UPGRADE) ---
    document.addEventListener('click', async function(e) {
        if (e.target && e.target.innerText && e.target.innerText.includes('Mulai Scan')) {
            e.preventDefault();
            const inputUrl = document.querySelector('input[type="text"]') || document.querySelector('input[type="url"]');
            if (!inputUrl || !inputUrl.value) { alert('Isi URL target dulu!'); return; }
            
            const cardContainer = inputUrl.closest('div[style*="border"]') || inputUrl.closest('.card') || inputUrl.parentNode.parentNode;
            window.showLoading();
            
            try {
                const resp = await fetch('/api/tools/webscan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: inputUrl.value })
                });
                const data = await resp.json();
                
                let oldPanel = document.getElementById('scan-result-panel');
                if (oldPanel) oldPanel.remove();

                let resultDiv = document.createElement('div');
                resultDiv.id = 'scan-result-panel';
                resultDiv.style.cssText = "margin-top: 20px; width: 100%; box-sizing: border-box;";
                
                // --- RENDER INFO GAYA TERMINAL HACKER ---
                let infoHtml = '';
                if (data.data && data.data.info) {
                    infoHtml = `<div style="background: #111; border: 3px solid #000; padding: 10px; margin-bottom: 15px; border-radius: 5px; font-family: monospace; color: #0f0; font-size: 12px; box-shadow: 3px 3px 0 #000;">`;
                    data.data.info.forEach(i => {
                        infoHtml += `<div>> ${i}</div>`;
                    });
                    infoHtml += `</div>`;
                }

                // --- RENDER VULN DENGAN WARNA LEVEL ---
                let vulnHtml = '';
                if (data.data && data.data.vulnerabilities) {
                    data.data.vulnerabilities.forEach(v => {
                        // Warna khusus berdasarkan level
                        let bgColor = '#ffeaa7'; // Default Low (Kuning)
                        let textColor = '#000';
                        if (v.level === 'Critical') { bgColor = '#ff7675'; textColor = '#fff'; }
                        else if (v.level === 'Medium') { bgColor = '#e17055'; textColor = '#fff'; }
                        else if (v.level === 'Aman') { bgColor = '#55efc4'; textColor = '#000'; }

                        vulnHtml += `<div style="background: ${bgColor}; color: ${textColor}; border: 3px solid #000; padding: 10px; margin-top: 10px; border-radius: 5px; box-shadow: 3px 3px 0 #000;">
                            <b style="font-size: 14px; text-transform: uppercase;">${v.type} [${v.level}]</b><br>
                            <span style="font-size: 12px; font-weight: bold;">${v.detail}</span>
                        </div>`;
                    });
                }

                if (data.status === false) {
                    vulnHtml += `<div style="background: #d63031; color: #fff; border: 3px solid #000; padding: 10px; margin-top: 10px; border-radius: 5px; box-shadow: 3px 3px 0 #000;">
                        <b>Gagal Koneksi:</b> ${data.message}
                    </div>`;
                }

                // --- GABUNGKAN SEMUA ---
                resultDiv.innerHTML = `
                    <div style="border-top: 3px dashed #000; margin: 15px 0;"></div>
                    <h3 style="margin-top: 0; font-size: 18px; text-transform: uppercase;">Hasil Scan</h3>
                    <p style="font-size: 13px; margin-bottom: 10px;"><b>Target:</b> ${data.data ? data.data.target : inputUrl.value}</p>
                    ${infoHtml}
                    ${vulnHtml}
                `;
                
                if (cardContainer) { cardContainer.appendChild(resultDiv); } 
                else { inputUrl.parentNode.appendChild(resultDiv); }

            } catch (err) {
                alert('Gagal scan: ' + err.message);
            } finally {
                window.hideLoading();
            }
        }
    });
})();
