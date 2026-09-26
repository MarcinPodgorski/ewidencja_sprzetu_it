const API_BASE = '/sprzet/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | undefined>;

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Query;
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.pathname + url.search;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  // FormData (uploady faktur) idzie do fetch() bez modyfikacji — przeglądarka sama
  // ustawia `Content-Type: multipart/form-data; boundary=...`; ręczne ustawienie
  // nagłówka bez boundary zepsułoby parsowanie po stronie serwera (multer).
  const isFormData = options.body instanceof FormData;
  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    credentials: 'same-origin',
    headers: options.body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body === undefined ? undefined : isFormData ? (options.body as FormData) : JSON.stringify(options.body),
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const isJson = res.headers.get('content-type')?.includes('application/json') ?? false;
  const data = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const message = (data && typeof data.error === 'string' && data.error) || `Błąd żądania (${res.status})`;
    throw new ApiError(res.status, message, data?.details);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => apiRequest<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};

/** Pełna ścieżka API do zwykłego linku `<a href>` (np. pobranie załącznika faktury —
 *  cookie httpOnly leci automatycznie przy zwykłej nawigacji, bez potrzeby fetch+blob). */
export function apiUrl(path: string): string {
  return buildUrl(path);
}

/** Pobiera plik binarny (np. PDF protokołu) i inicjuje jego zapis w przeglądarce. */
export async function downloadFile(path: string, body: unknown, suggestedName: string): Promise<void> {
  const res = await fetch(buildUrl(path), {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = `Błąd żądania (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // odpowiedź nie jest JSON-em — zostawiamy generyczny komunikat
    }
    throw new ApiError(res.status, message);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Wysyłka formularza z plikiem z raportowaniem postępu — `fetch` nie daje postępu
 * uploadu, a instalatory w katalogu onboardingu potrafią mieć setki MB.
 */
export function wyslijZPostepem<T>(
  method: 'POST' | 'PUT',
  path: string,
  formData: FormData,
  onPostep?: (ulamek: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, buildUrl(path));
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onPostep) onPostep(e.loaded / e.total);
    };
    xhr.onload = () => {
      const data = xhr.response as { error?: unknown; details?: unknown } | null;
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T);
        return;
      }
      const komunikat =
        xhr.status === 413
          ? 'Plik jest za duży dla serwera — sprawdź client_max_body_size w konfiguracji nginx'
          : (data && typeof data.error === 'string' && data.error) || `Błąd żądania (${xhr.status})`;
      reject(new ApiError(xhr.status, komunikat, data?.details));
    };
    xhr.onerror = () => reject(new ApiError(0, 'Błąd sieci podczas wysyłania pliku'));
    xhr.send(formData);
  });
}
