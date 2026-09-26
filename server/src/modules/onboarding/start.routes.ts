import path from 'path';
import { Router } from 'express';
import type { OnboardingTryb } from 'shared';
import { INSTALATORY_DIR } from '../../config/uploads';
import { prisma } from '../../db/prisma';
import { asyncHandler } from '../../middleware/errorHandler';
import { adresApi } from './adresApi';
import { KOD_REGEX } from './onboarding.routes';
import { generateOnboardingScript, konfiguracjaOnboardinguSchema, skryptBledu } from './scriptGenerator';

/**
 * PUBLICZNE endpointy (bez logowania) dla nowego laptopa:
 *   irm http://<serwer>/sprzet/api/start/<kod> | iex      — skrypt
 *   GET /start/<kod>/pliki/<id>                          — instalator z katalogu
 * Świeży laptop nie ma sesji w aplikacji — dostęp chroni wyłącznie krótkotrwały,
 * losowy kod. Skrypt celowo nie zawiera haseł (patrz WAZNOSC_KODU_MS).
 */
export const onboardingStartRouter = Router();

async function znajdzWaznaSesje(kodSurowy: string) {
  const kod = kodSurowy.toLowerCase();
  if (!KOD_REGEX.test(kod)) return null;
  const sesja = await prisma.onboardingSesja.findUnique({ where: { token: kod } });
  return sesja && sesja.wygasaAt.getTime() >= Date.now() ? sesja : null;
}

/**
 * Nieprawidłowy/wygasły kod zwraca 200 z mini-skryptem wypisującym błąd: `irm` przy
 * statusie 4xx rzuca wyjątek bez treści odpowiedzi, więc admin nie wiedziałby, co się stało.
 */
onboardingStartRouter.get(
  '/:kod',
  asyncHandler(async (req, res) => {
    // Kodowanie jawnie: PowerShell 5.1 bez `charset` dekoduje odpowiedź jako ISO-8859-1.
    // Bez BOM — przy `iex` znak BOM na początku zepsułby pierwszą instrukcję.
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    const sesja = await znajdzWaznaSesje(req.params.kod);
    if (!sesja) {
      res.send(skryptBledu('Ten kod skryptu onboardingu jest nieprawidłowy albo wygasł. Wygeneruj nowy w aplikacji Ewidencja sprzętu.'));
      return;
    }

    await prisma.onboardingSesja.update({ where: { id: sesja.id }, data: { pobranoAt: new Date() } });
    const konfiguracja = konfiguracjaOnboardinguSchema.parse(JSON.parse(sesja.konfiguracja));
    res.send(
      generateOnboardingScript(sesja.tryb as OnboardingTryb, konfiguracja, {
        wygenerowano: sesja.createdAt,
        kod: sesja.token,
        adresSerwera: adresApi(req),
      }),
    );
  }),
);

/**
 * Instalator dla skryptu. Wydawany tylko, gdy kod jest ważny ORAZ program jest w migawce
 * tej sesji — instalatory z konsol typu ESET PROTECT zawierają konfigurację firmy, więc
 * nie mogą być dostępne dla każdego, kto zgadnie ID. Zwraca bieżący plik z katalogu;
 * jeśli po wygenerowaniu skryptu go podmieniono, skrypt wykryje to po sumie SHA-256.
 */
onboardingStartRouter.get(
  '/:kod/pliki/:id',
  asyncHandler(async (req, res) => {
    const sesja = await znajdzWaznaSesje(req.params.kod);
    if (!sesja) {
      res.status(410).type('text/plain; charset=utf-8').send('Kod skryptu jest nieprawidłowy albo wygasł.');
      return;
    }
    const id = Number(req.params.id);
    const konfiguracja = konfiguracjaOnboardinguSchema.parse(JSON.parse(sesja.konfiguracja));
    const wMigawce = konfiguracja.programy.some((p) => p.typ === 'PLIK' && p.oprogramowanieId === id);
    const program = wMigawce ? await prisma.oprogramowanie.findUnique({ where: { id } }) : null;
    if (!program?.plik || !program.plikNazwa) {
      res.status(404).type('text/plain; charset=utf-8').send('Nie znaleziono instalatora dla tego skryptu.');
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.download(path.join(INSTALATORY_DIR, program.plik), program.plikNazwa);
  }),
);
