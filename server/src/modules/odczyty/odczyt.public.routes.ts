import { Router } from 'express';
import { daneOdczytuSchema } from 'shared';
import { prisma } from '../../db/prisma';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { KOD_REGEX } from '../../utils/kodDostepu';
import { adresApi } from '../onboarding/adresApi';
import { skryptBledu } from '../../utils/powershell';
import { utworzAgenta, zapiszOdczyt, zapiszOdczytAgenta, znajdzAktywnegoAgenta } from './odczyty.service';
import { generujAgentaOdczytu, generujInstalatorOdczytu, generujSkryptOdczytu } from './skryptOdczytu';

/**
 * PUBLICZNE endpointy (bez logowania) skryptu odczytu:
 *   irm http://<serwer>/sprzet/api/odczyt/<kod> | iex   — skrypt
 *   POST /odczyt/<kod>                                  — dane z komputera (JSON)
 * Dostęp chroni krótkotrwały kod. Odczyt niczego nie zmienia w ewidencji sam z siebie —
 * trafia na listę do przejrzenia, więc nawet nadużyty kod nie nadpisze danych.
 */
export const odczytPublicznyRouter = Router();

// ---------------------------------------------------------------------------
// Odczyt cykliczny (stały token komputera)
// ---------------------------------------------------------------------------

/** Skrypt zadania — pobiera go instalator. Z BOM, bo trafia na dysk jako plik .ps1
 *  (PowerShell 5.1 czyta pliki bez BOM w stronie kodowej ANSI). */
odczytPublicznyRouter.get(
  '/agent/:token/skrypt',
  asyncHandler(async (req, res) => {
    const agent = await znajdzAktywnegoAgenta(req.params.token);
    if (!agent) {
      res.status(410).type('text/plain; charset=utf-8').send('Token odczytu cyklicznego jest nieprawidłowy albo wyłączony.');
      return;
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(`\uFEFF${generujAgentaOdczytu({ token: agent.token, adresSerwera: adresApi(req), wygenerowano: new Date() })}`);
  }),
);

odczytPublicznyRouter.post(
  '/agent/:token',
  asyncHandler(async (req, res) => {
    const agent = await znajdzAktywnegoAgenta(req.params.token);
    if (!agent) {
      throw new AppError(410, 'Odczyt cykliczny tego komputera jest wyłączony — usuń zadanie EwidencjaSprzetu-Odczyt albo zainstaluj je ponownie');
    }
    const { komunikat } = await zapiszOdczytAgenta(agent, daneOdczytuSchema.parse(req.body));
    res.status(201).json({ komunikat });
  }),
);

// ---------------------------------------------------------------------------
// Jednorazowy odczyt i instalator odczytu cyklicznego (krótki kod)
// ---------------------------------------------------------------------------

async function znajdzWaznyKod(kodSurowy: string) {
  const kod = kodSurowy.toLowerCase();
  if (!KOD_REGEX.test(kod)) return null;
  const wpis = await prisma.odczytKod.findUnique({
    where: { kod },
    include: { computer: { select: { id: true, numerEwidencyjny: true } } },
  });
  return wpis && wpis.wygasaAt.getTime() >= Date.now() ? wpis : null;
}

odczytPublicznyRouter.get(
  '/:kod',
  asyncHandler(async (req, res) => {
    // Jak przy onboardingu: jawne UTF-8 (PS 5.1 bez charset czyta ISO-8859-1), bez BOM dla `iex`.
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    const kod = await znajdzWaznyKod(req.params.kod);
    if (!kod) {
      res.send(skryptBledu('Ten kod odczytu jest nieprawidłowy albo wygasł. Wygeneruj nowy w aplikacji Ewidencja sprzętu (Odczyt sprzętu).'));
      return;
    }
    res.send(
      generujSkryptOdczytu({
        kod: kod.kod,
        adresSerwera: adresApi(req),
        komputer: kod.computer?.numerEwidencyjny ?? null,
        wygenerowano: new Date(),
      }),
    );
  }),
);

odczytPublicznyRouter.post(
  '/:kod',
  asyncHandler(async (req, res) => {
    const kod = await znajdzWaznyKod(req.params.kod);
    if (!kod) throw new AppError(410, 'Kod odczytu jest nieprawidłowy albo wygasł — wygeneruj nowy w aplikacji');
    const dane = daneOdczytuSchema.parse(req.body);
    const { komunikat } = await zapiszOdczyt({
      dane,
      zrodlo: 'SKRYPT',
      kodId: kod.id,
      wskazany: kod.computer ? { computerId: kod.computer.id, dopasowanie: 'KOD' } : null,
    });
    res.status(201).json({ komunikat });
  }),
);

/**
 * Instalator odczytu cyklicznego: `irm …/odczyt/<kod>/instaluj | iex` w Terminalu jako
 * administrator. Każde pobranie tworzy nowy stały token (przypięty do komputera kodu albo
 * — przy kodzie ogólnym — do komputera, który uda się dopasować przy pierwszym odczycie).
 */
odczytPublicznyRouter.get(
  '/:kod/instaluj',
  asyncHandler(async (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    const kod = await znajdzWaznyKod(req.params.kod);
    if (!kod) {
      res.send(skryptBledu('Ten kod odczytu jest nieprawidłowy albo wygasł. Wygeneruj nowy w aplikacji Ewidencja sprzętu (Odczyt sprzętu).'));
      return;
    }
    const agent = await utworzAgenta(kod.computer?.id ?? null);
    res.send(
      generujInstalatorOdczytu({
        token: agent.token,
        adresSerwera: adresApi(req),
        komputer: kod.computer?.numerEwidencyjny ?? null,
        wygenerowano: new Date(),
      }),
    );
  }),
);

