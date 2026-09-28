import { TYPY_Z_ETYKIETA, type TypZEtykieta } from 'shared';
import { getEquipmentDelegate } from './equipmentLookup';

/** Sprzęt z numerem ewidencyjnym razem z tym, gdzie powinien się znajdować — wspólne źródło
 *  dla wyboru naklejek QR i dla listy startowej spisu z natury. */
export interface SprzetZEtykieta {
  sprzetTyp: TypZEtykieta;
  sprzetId: number;
  identyfikator: string;
  opis: string | null;
  numerSeryjny: string | null;
  /** Imię i nazwisko użytkownika albo lokalizacja drukarki. */
  uzytkownik: string | null;
  dzialId: number | null;
  /** Dział użytkownika — do grupowania; drukarki mają osobną grupę. */
  dzial: string | null;
  wycofany: boolean;
}

export const GRUPA_DRUKAREK = 'Drukarki';
export const GRUPA_NIEPRZYPISANYCH = 'Nieprzypisany (magazyn IT)';

interface Filtr {
  typy?: readonly TypZEtykieta[];
  /** Tylko sprzęt pracowników z tego działu (drukarki nie mają pracownika, więc odpadają). */
  dzialId?: number | null;
  /** Konkretne sztuki (np. wybrane do wydruku) — wtedy także wycofane. */
  pozycje?: { sprzetTyp: TypZEtykieta; sprzetId: number }[];
}

interface Wiersz {
  id: number;
  numerEwidencyjny: string;
  markaModel: string | null;
  numerSeryjny: string | null;
  wycofany: boolean;
  dzialPietroMiejsce?: string;
  aktualnyUzytkownik?: { imie: string; nazwisko: string; dzialId: number; dzial: { nazwa: string } } | null;
}

export async function listaSprzetuZEtykieta(filtr: Filtr = {}): Promise<SprzetZEtykieta[]> {
  const typy = filtr.typy ?? TYPY_Z_ETYKIETA;
  const perTyp = await Promise.all(
    typy.map(async (sprzetTyp) => {
      const drukarka = sprzetTyp === 'DRUKARKA';
      if (drukarka && filtr.dzialId) return [];
      const wybrane = filtr.pozycje?.filter((p) => p.sprzetTyp === sprzetTyp).map((p) => p.sprzetId);
      if (wybrane && wybrane.length === 0) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = wybrane ? { id: { in: wybrane } } : { wycofany: false };
      if (filtr.dzialId) where.aktualnyUzytkownik = { dzialId: filtr.dzialId };
      const wiersze: Wiersz[] = await getEquipmentDelegate(sprzetTyp).findMany({
        where,
        include: drukarka ? undefined : { aktualnyUzytkownik: { include: { dzial: true } } },
        orderBy: { numerEwidencyjny: 'asc' },
      });

      return wiersze.map((w): SprzetZEtykieta => {
        const osoba = w.aktualnyUzytkownik;
        return {
          sprzetTyp,
          sprzetId: w.id,
          identyfikator: w.numerEwidencyjny,
          opis: w.markaModel,
          numerSeryjny: w.numerSeryjny,
          uzytkownik: drukarka ? (w.dzialPietroMiejsce ?? null) : osoba ? `${osoba.imie} ${osoba.nazwisko}` : null,
          dzialId: osoba?.dzialId ?? null,
          dzial: drukarka ? GRUPA_DRUKAREK : (osoba?.dzial.nazwa ?? GRUPA_NIEPRZYPISANYCH),
          wycofany: w.wycofany,
        };
      });
    }),
  );
  return perTyp.flat();
}
