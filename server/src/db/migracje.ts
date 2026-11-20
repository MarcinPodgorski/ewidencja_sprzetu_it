import { execFileSync } from 'child_process';
import path from 'path';
import { env } from '../config/env';

/**
 * W produkcji serwer przy starcie sam nakłada brakujące migracje bazy (`prisma migrate deploy`),
 * z tym samym DATABASE_URL, którego używa aplikacja — nie trzeba pamiętać o osobnym kroku przy
 * aktualizacji ani wpisywać ścieżki bazy do server/.env. Na aktualnej bazie to ułamek sekundy.
 * W dev migracje tworzy się świadomie (`npm run prisma:migrate`), więc tu nic się nie dzieje.
 */
export function nalozMigracje(): void {
  if (env.NODE_ENV !== 'production') return;
  const serverDir = path.resolve(__dirname, '../..');
  const prismaCli = require.resolve('prisma/build/index.js', { paths: [serverDir] });
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy', '--schema', path.join(serverDir, 'prisma/schema.prisma')], {
    env: { ...process.env, DATABASE_URL: env.DATABASE_URL, CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1' },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
}
