// ==========================================
// GLOBAL AUTH UI - USERNAME & LOGOUT BUTTON
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // --- 1. TAMPILKAN USERNAME ---
    const username = localStorage.getItem('username') || localStorage.getItem('xyrex_user') || localStorage.getItem('user');
    const userElements = document.querySelectorAll('.username, #username-display, #profile-btn, .user-profile, header button:not(#hamburger)');
    
    if (username) {
        userElements.forEach(el => {
            if (el.tagName === 'BUTTON' || el.tagName === 'SPAN' || el.tagName === 'DIV') {
                if (el.innerText === '-' || el.innerText === '') {
                    el.innerText = username.toUpperCase();
                }
            }
        });
    }

    // --- 2. SEMBUNYIKAN TOMBOL LOGOUT BAWAAN & TAMBAHKAN YANG BARU ---
    const sidebar = document.querySelector('.sidebar, #sidebar, .offcanvas, .menu');
    
    if (sidebar) {
        // Cari semua elemen <a> atau <div> yang teksnya mengandung "Logout" di dalam sidebar
        const existingLogoutLinks = Array.from(sidebar.querySelectorAll('a, div, button')).filter(el => {
            // Pastikan hanya yang teksnya persis "Logout" atau mengandung kata Logout
            return el.innerText && el.innerText.trim().toLowerCase() === 'logout';
        });

        // Sembunyikan tombol Logout bawaan
        existingLogoutLinks.forEach(el => {
            el.style.display = 'none';
            // Atau sembunyikan parent-nya jika ada container
            if (el.parentNode && el.parentNode.tagName !== 'BODY') {
                el.parentNode.style.display = 'none';
            }
        });

        // Tambahkan tombol Logout Neo-brutalism yang baru
        if (!document.getElementById('btn-logout-xyrex')) {
            const logoutBtn = document.createElement('div');
            logoutBtn.id = 'btn-logout-xyrex';
            
            logoutBtn.style.cssText = `
                margin: 20px 15px; 
                padding: 15px; 
                background: #d63031; 
                color: white; 
                font-weight: bold; 
                text-align: center; 
                border: 3px solid #000; 
                box-shadow: 4px 4px 0 #000; 
                cursor: pointer; 
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                font-family: inherit;
            `;
            
            logoutBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                LOGOUT
            `;
            
            logoutBtn.onclick = function() {
                localStorage.clear();
                window.location.href = 'index.html';
            };

            sidebar.appendChild(logoutBtn);
        }
    }
});
