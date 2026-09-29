import crypto from 'crypto';

/**
 * Krótki kod dostępu do publicznych jednolinijkowców (`irm …/start/<kod> | iex`,
 * `irm …/odczyt/<kod> | iex`) — do przepisania ręcznie na komputerze, więc bez znaków
 * mylących się przy przepisywaniu (0/o, 1/l/i). 31^8 ≈ 8,5·10^11 kombinacji, a każdy
 * kod ma ograniczoną ważność.
 */
const ALFABET_KODU = 'abcdefghjkmnpqrstuvwxyz23456789';
export const KOD_REGEX = /^[a-hjkmnp-z2-9]{8}$/;

export function wygenerujKod(): string {
  let kod = '';
  for (let i = 0; i < 8; i++) kod += ALFABET_KODU[crypto.randomInt(ALFABET_KODU.length)];
  return kod;
}

/** Stały token odczytu cyklicznego — zapisany na komputerze i ważny bezterminowo (do wyłączenia),
 *  więc dłuższy niż krótkie kody do przepisywania: 31^32 kombinacji. */
export const TOKEN_REGEX = /^[a-hjkmnp-z2-9]{32}$/;

export function wygenerujToken(): string {
  let token = '';
  for (let i = 0; i < 32; i++) token += ALFABET_KODU[crypto.randomInt(ALFABET_KODU.length)];
  return token;
}
