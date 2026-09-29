// Konfiguracja PM2 dla produkcji. Uruchamiane z katalogu repo na serwerze Ubuntu:
//   pm2 start ecosystem.config.js
//   pm2 save
// Przed pierwszym startem: `npm ci && npm run build && npm run prisma:migrate:deploy`.
//
// WAŻNE: podmień JWT_SECRET na losowy ciąg przed wdrożeniem, np.:
//   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

module.exports = {
  apps: [
    {
      name: 'sprzet-it',
      cwd: __dirname,
      script: 'server/dist/index.js',
      instances: 1, // SQLite ma jednego writera — nie skalować do wielu instancji
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        DATABASE_URL: 'file:/var/lib/sprzet-it/sprzet.db',
        JWT_SECRET: 'ZMIEN_MNIE_NA_LOSOWY_SEKRET_PRZED_WDROZENIEM',
        COOKIE_SECURE: 'false',
        APP_BASE_PATH: '/sprzet',
        BACKUP_DIR: '/var/backups/sprzet-it',
        BACKUP_RETENTION_DAYS: '30',
        BACKUP_HOUR: '2',
        BACKUP_AUTO: 'true',
      },
      max_memory_restart: '300M',
      autorestart: true,
      watch: false,
      out_file: '/var/log/sprzet-it/out.log',
      error_file: '/var/log/sprzet-it/error.log',
      time: true,
    },
  ],
};
