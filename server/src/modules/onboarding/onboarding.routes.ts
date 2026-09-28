import { Router } from 'express';
import { idParamSchema, onboardingSesjaCreateSchema, ustawieniaOnboardinguSchema, type OnboardingTryb } from 'shared';
import { prisma } from '../../db/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { wygenerujKod } from '../../utils/kodDostepu';
import * as assignmentHistoryService from '../assignmentHistory/assignmentHistory.service';
import { adresApi } from './adresApi';
import {
  generateOnboardingScript,
  konfiguracjaOnboardinguSchema,
  type KonfiguracjaOnboardingu,
  type ProgramOnboardingu,
} from './scriptGenerator';

export const onboardingRouter = Router();

onboardingRouter.use(requireAuth, requireRole('ADMIN'));

/** Jak długo działa kod do `irm …/start/<kod> | iex`. Skrypt nie zawiera haseł
 *  (hasło konta lokalnego wpisuje się przy uruchomieniu), więc kilka dni wystarczy
 *  na przygotowanie laptopa, a link i tak sam wygaśnie. */
const WAZNOSC_KODU_MS = 72 * 60 * 60 * 1000;

const DOMYSLNE_USTAWIENIA = {
  komunikatTytul: 'Komputer służbowy {komputer}',
  komunikatTresc: [
    'Ten komputer jest własnością firmy i jest przypisany do: {pracownik} ({dzial}).',
    'Korzystając z niego, akceptujesz zasady korzystania ze sprzętu służbowego.',
    'W razie problemów skontaktuj się z działem IT.',
  ].join('\n'),
};

async function pobierzUstawienia() {
  return prisma.ustawieniaOnboardingu.upsert({ where: { id: 1 }, update: {}, create: { id: 1, ...DOMYSLNE_USTAWIENIA } });
}

const sesjaInclude = {
  computer: { select: { id: true, numerEwidencyjny: true } },
  employee: { select: { id: true, imie: true, nazwisko: true, email: true } },
  utworzylAppUser: { select: { id: true, login: true } },
} as const;

type SesjaZRelacjami = NonNullable<Awaited<ReturnType<typeof znajdzSesje>>>;

function znajdzSesje(id: number) {
  return prisma.onboardingSesja.findUnique({ where: { id }, include: sesjaInclude });
}

function serialize(sesja: SesjaZRelacjami) {
  return {
    ...sesja,
    wygasla: sesja.wygasaAt.getTime() < Date.now(),
    konfiguracja: konfiguracjaOnboardinguSchema.parse(JSON.parse(sesja.konfiguracja)),
  };
}

// ---------------------------------------------------------------------------
// Ustawienia (domyślny komunikat przy logowaniu)
// ---------------------------------------------------------------------------

onboardingRouter.get(
  '/ustawienia',
  asyncHandler(async (_req, res) => {
    res.json({ item: await pobierzUstawienia() });
  }),
);

onboardingRouter.put(
  '/ustawienia',
  asyncHandler(async (req, res) => {
    const data = ustawieniaOnboardinguSchema.parse(req.body);
    const item = await prisma.ustawieniaOnboardingu.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
    res.json({ item });
  }),
);

// ---------------------------------------------------------------------------
// Sesje (wygenerowane skrypty)
// ---------------------------------------------------------------------------

onboardingRouter.get(
  '/sesje',
  asyncHandler(async (req, res) => {
    const computerId = req.query.computerId ? Number(req.query.computerId) : undefined;
    const sesje = await prisma.onboardingSesja.findMany({
      where: computerId ? { computerId } : {},
      include: sesjaInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ items: sesje.map(serialize) });
  }),
);

onboardingRouter.get(
  '/sesje/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const sesja = await znajdzSesje(id);
    if (!sesja) throw new AppError(404, 'Nie znaleziono skryptu onboardingu');
    res.json({ item: serialize(sesja) });
  }),
);

onboardingRouter.post(
  '/sesje',
  asyncHandler(async (req, res) => {
    const data = onboardingSesjaCreateSchema.parse(req.body);

    const computer = await prisma.computer.findUnique({ where: { id: data.computerId } });
    if (!computer) throw new AppError(404, 'Nie znaleziono komputera');
    if (computer.wycofany) throw new AppError(400, 'Nie można przygotować skryptu dla wycofanego komputera');

    const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
    if (!employee || !employee.aktywny) throw new AppError(400, 'Wybrany pracownik nie istnieje lub jest nieaktywny');

    const ids = [...new Set(data.oprogramowanieIds)];
    const programy = ids.length
      ? await prisma.oprogramowanie.findMany({ where: { id: { in: ids } }, orderBy: { nazwa: 'asc' } })
      : [];
    if (programy.length !== ids.length) throw new AppError(400, 'Część wybranych programów nie istnieje już w katalogu');

    const migawkaProgramow: ProgramOnboardingu[] = programy.map((p) => {
      if (p.zrodlo === 'PLIK') {
        if (!p.plik || !p.plikNazwa || p.plikRozmiar === null || !p.plikSha256) {
          throw new AppError(400, `Program „${p.nazwa}” nie ma wgranego pliku instalacyjnego`);
        }
        return {
          typ: 'PLIK',
          nazwa: p.nazwa,
          oprogramowanieId: p.id,
          plikNazwa: p.plikNazwa,
          plikRozmiar: p.plikRozmiar,
          plikSha256: p.plikSha256,
          argumenty: p.argumenty,
        };
      }
      return { typ: 'WINGET', nazwa: p.nazwa, wingetId: p.wingetId ?? '' };
    });

    const konfiguracja: KonfiguracjaOnboardingu = {
      nazwaKomputera: data.nazwaKomputera,
      imieNazwisko: `${employee.imie} ${employee.nazwisko}`,
      loginLokalny: data.tryb === 'HOME' ? data.loginLokalny ?? null : null,
      emailM365: data.emailM365 ?? null,
      komunikat: data.komunikat,
      programy: migawkaProgramow,
      m365Apps: data.m365Apps,
    };

    let token = wygenerujKod();
    while (await prisma.onboardingSesja.findUnique({ where: { token } })) token = wygenerujKod();

    const utworzona = await prisma.onboardingSesja.create({
      data: {
        token,
        computerId: computer.id,
        employeeId: employee.id,
        tryb: data.tryb,
        konfiguracja: JSON.stringify(konfiguracja),
        wygasaAt: new Date(Date.now() + WAZNOSC_KODU_MS),
        utworzylAppUserId: req.user!.id,
      },
    });

    // Onboarding = wydanie komputera pracownikowi — od razu przypisujemy (z wpisem w historii),
    // chyba że admin odznaczył tę opcję albo komputer już jest u tego pracownika.
    if (data.przypiszDoPracownika && computer.aktualnyUzytkownikId !== employee.id) {
      await assignmentHistoryService.assign({
        sprzetTyp: 'KOMPUTER',
        sprzetId: computer.id,
        employeeId: employee.id,
        notatka: 'Onboarding',
        actorAppUserId: req.user!.id,
        modelName: 'computer',
      });
    }

    const sesja = await znajdzSesje(utworzona.id);
    res.status(201).json({ item: serialize(sesja!) });
  }),
);

/** Pobranie skryptu jako pliku (np. na pendrive) — z BOM, bo Windows PowerShell 5.1
 *  czyta pliki .ps1 bez BOM w stronie kodowej ANSI i psuje polskie znaki. */
onboardingRouter.get(
  '/sesje/:id/skrypt',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const sesja = await prisma.onboardingSesja.findUnique({ where: { id } });
    if (!sesja) throw new AppError(404, 'Nie znaleziono skryptu onboardingu');
    const konfiguracja = konfiguracjaOnboardinguSchema.parse(JSON.parse(sesja.konfiguracja));
    const skrypt = generateOnboardingScript(sesja.tryb as OnboardingTryb, konfiguracja, {
      wygenerowano: sesja.createdAt,
      kod: sesja.token,
      adresSerwera: adresApi(req),
    });
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="onboarding-${konfiguracja.nazwaKomputera}.ps1"`);
    res.send(`\uFEFF${skrypt}`);
  }),
);
