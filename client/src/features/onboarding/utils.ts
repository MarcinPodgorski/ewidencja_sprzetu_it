import { apiUrl } from '../../lib/api';

/** Proponowany login lokalny: pierwsza litera imienia + nazwisko, bez polskich znaków,
 *  np. „Katarzyna Zielińska” → „kzielinska”. Max 20 znaków (limit Windowsa). */
export function sugerowanyLogin(imie: string, nazwisko: string): string {
  const oczysc = (tekst: string) =>
    tekst
      .replace(/ł/g, 'l')
      .replace(/Ł/g, 'L') // „ł” nie rozkłada się w NFD na literę + znak diakrytyczny
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  return (oczysc(imie).slice(0, 1) + oczysc(nazwisko)).slice(0, 20);
}

export interface DaneSzablonu {
  komputer: string;
  pracownik: string;
  dzial: string;
}

/** Podstawia {komputer}, {pracownik}, {dzial} w szablonie komunikatu z ustawień. */
export function wypelnijSzablon(szablon: string, dane: DaneSzablonu): string {
  return szablon
    .replace(/\{komputer\}/g, dane.komputer)
    .replace(/\{pracownik\}/g, dane.pracownik)
    .replace(/\{dzial\}/g, dane.dzial);
}

/** Jednolinijkowiec do wklejenia w PowerShellu na nowym laptopie. Adres serwera bierzemy
 *  z paska przeglądarki — laptop w tej samej sieci widzi aplikację pod tym samym adresem. */
export function komendaStartowa(token: string): string {
  return `irm ${window.location.origin}${apiUrl(`/start/${token}`)} | iex`;
}

export function formatujDate(value: string): string {
  return new Date(value).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatujRozmiar(bajty: number): string {
  if (bajty >= 1024 * 1024) return `${(bajty / (1024 * 1024)).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bajty / 1024))} KB`;
}
