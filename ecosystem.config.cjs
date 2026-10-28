// PM2 Ecosystem Config
// Install PM2 : npm install -g pm2
// Jalankan    : pm2 start ecosystem.config.cjs
// Auto-start  : pm2 save && pm2 startup
// Monitor     : pm2 monit
// Log         : pm2 logs kasir-online

module.exports = {
  apps: [
    {
      name: 'kasir-online',
      script: 'backend/server.js',
      cwd: '/var/www/kasir_online',

      // Environment production
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      env: {
        NODE_ENV: 'development',
        PORT: 3002,
      },

      // Restart otomatis jika crash
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',

      // Log
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/log/kasir-online/error.log',
      out_file:   '/var/log/kasir-online/out.log',
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 5000,
    },
  ],
};
