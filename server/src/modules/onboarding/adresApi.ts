import type { Request } from 'express';
import { env } from '../../config/env';

const HOST_REGEX = /^[A-Za-z0-9.\-:[\]]+$/;

/**
 * Bazowy adres API widziany przez klienta, np. http://192.168.1.10/sprzet/api — skrypt
 * pobiera spod niego instalatory. Liczony z żądania, którym laptop pobrał skrypt, więc
 * na pewno jest z laptopa osiągalny. Za nginx wymaga `proxy_set_header Host $host`
 * (jest w konfiguracji z README), w dev Vite domyślnie zachowuje nagłówek Host.
 */
export function adresApi(req: Request): string {
  const pierwszy = (wartosc: string | undefined) => wartosc?.split(',')[0]?.trim() || undefined;
  const proto = pierwszy(req.get('x-forwarded-proto')) ?? req.protocol;
  const kandydat = pierwszy(req.get('x-forwarded-host')) ?? req.get('host');
  const host = kandydat && HOST_REGEX.test(kandydat) ? kandydat : 'localhost';
  return `${proto === 'https' ? 'https' : 'http'}://${host}${env.APP_BASE_PATH}/api`;
}
