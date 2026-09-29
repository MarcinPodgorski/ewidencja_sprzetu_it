/** Tekst do porównań: małe litery, bez polskich znaków, pojedyncze spacje (jak wyszukiwarka na serwerze). */
export function doPorownania(tekst: string): string {
  return tekst
    .toLowerCase()
    .replace(/ł/g, 'l') // „ł” nie rozkłada się w NFD na literę + znak diakrytyczny
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
