// ==========================================
// GLOBAL AUTH UI - TAMPILKAN USERNAME
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // 1. Ambil username dari localStorage (sesuaikan key-nya jika berbeda, misal 'username' atau 'xyrex_user')
    const username = localStorage.getItem('username') || localStorage.getItem('xyrex_user') || localStorage.getItem('user');
    
    // 2. Cari elemen di pojok kanan atas (biasanya ada class 'username', '.profile-btn', atau tombol yang ada di header)
    // Kita akan mencari semua kemungkinan elemen yang menampilkan nama user
    const userElements = document.querySelectorAll('.username, #username-display, #profile-btn, .user-profile, header button:not(#hamburger)');
    
    if (username) {
        // Jika username ada, ubah teks di semua elemen yang ditemukan
        userElements.forEach(el => {
            // Jangan timpa tombol back atau ikon, pastikan ini teks
            if (el.tagName === 'BUTTON' || el.tagName === 'SPAN' || el.tagName === 'DIV') {
                el.innerText = username.toUpperCase();
            }
        });
    } else {
        // Jika tidak ada username di localStorage (belum login), tendang ke halaman login
        // Tapi hanya jika kita tidak sedang di halaman login (index.html)
        if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
            // window.location.href = 'index.html'; // Buka komentar ini jika ingin memaksa login
        }
    }
});
