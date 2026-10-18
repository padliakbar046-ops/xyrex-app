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
                // Jika tombolnya ada ikon minus (-), ganti dengan username
                if (el.innerText === '-' || el.innerText === '') {
                    el.innerText = username.toUpperCase();
                }
            }
        });
    }

    // --- 2. TAMBAHKAN TOMBOL LOGOUT DI SIDEBAR ---
    // Cari elemen sidebar (biasanya punya id 'sidebar', class 'sidebar', atau div yang berisi menu)
    const sidebar = document.querySelector('.sidebar, #sidebar, .offcanvas, .menu');
    
    if (sidebar) {
        // Cek apakah tombol logout sudah ada sebelumnya (biar tidak dobel)
        if (!document.getElementById('btn-logout-xyrex')) {
            // Buat elemen tombol logout
            const logoutBtn = document.createElement('div');
            logoutBtn.id = 'btn-logout-xyrex';
            
            // Styling Neo-brutalism (merah, border hitam tebal, shadow)
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
            
            // Tambahkan ikon SVG (opsional) dan teks
            logoutBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                LOGOUT
            `;
            
            // Efek klik
            logoutBtn.onclick = function() {
                // Hapus semua data sesi
                localStorage.removeItem('username');
                localStorage.removeItem('xyrex_user');
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                localStorage.clear(); // Bersihkan semua
                
                // Arahkan ke halaman login (index.html)
                window.location.href = 'index.html';
            };

            // Masukkan tombol ke paling bawah sidebar
            sidebar.appendChild(logoutBtn);
        }
    }
});
