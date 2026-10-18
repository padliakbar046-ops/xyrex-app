const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

module.exports = function(app) {
    // 1. Matikan x-powered-by
    app.disable('x-powered-by');

    // 2. Helmet (Konfigurasi longgar agar frontend tidak rusak)
    app.use(helmet({
        contentSecurityPolicy: false, // Wajib false agar inline script HTML jalan
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // 3. Rate Limiter untuk mencegah spam request (DDoS)
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 menit
        max: 100, // Maksimal 100 request per IP
        message: 'Terlalu banyak request, coba lagi nanti.'
    });
    
    // Terapkan limit hanya ke endpoint API (jangan ke static files)
    app.use('/api', limiter);
    
    // 4. Parser JSON dengan limit (Mencegah payload bomb)
    app.use(require('express').json({ limit: '10mb' }));
    app.use(require('express').urlencoded({ extended: true, limit: '10mb' }));
};
