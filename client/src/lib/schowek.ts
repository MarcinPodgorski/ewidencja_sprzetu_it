/** Kopiowanie działa też pod http://<ip> — navigator.clipboard wymaga HTTPS/localhost. */
export async function kopiujDoSchowka(tekst: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(tekst);
      return true;
    }
    const pole = document.createElement('textarea');
    pole.value = tekst;
    pole.style.position = 'fixed';
    pole.style.opacity = '0';
    document.body.appendChild(pole);
    pole.select();
    const ok = document.execCommand('copy');
    pole.remove();
    return ok;
  } catch {
    return false;
  }
}
