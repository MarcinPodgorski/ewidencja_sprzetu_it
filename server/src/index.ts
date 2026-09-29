import { env } from './config/env';
import { initDatabase } from './db/prisma';
import { createApp } from './app';
import { utworzPierwszegoAdmina } from './modules/appUsers/pierwszyAdmin';
import { uruchomHarmonogramKopii } from './modules/kopie/kopie.service';

async function main() {
  await initDatabase();
  await utworzPierwszegoAdmina();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(
      `[sprzet-it] serwer nasłuchuje na porcie ${env.PORT} (${env.NODE_ENV}), API pod ${env.APP_BASE_PATH}/api`,
    );
    uruchomHarmonogramKopii();
  });
}

main().catch((err) => {
  console.error('Nie udało się uruchomić serwera:', err);
  process.exit(1);
});
