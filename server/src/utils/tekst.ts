/** Tekst do porównań: małe litery, bez polskich znaków, pojedyncze spacje — „zielinska” znajdzie „Zielińską”. */
export function doPorownania(tekst: string): string {
  return tekst
    .toLowerCase()
    .replace(/ł/g, 'l') // „ł” nie rozkłada się w NFD na literę + znak diakrytyczny
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Identyfikator bez separatorów: „00:1A:2B…”, „00-1a-2b…” i „001a2b…” to ten sam MAC. */
export function kompaktowy(tekst: string): string {
  return doPorownania(tekst).replace(/[^a-z0-9]/g, '');
}
