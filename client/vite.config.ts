import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Aplikacja jest świadoma własnego base path (/sprzet) — identycznie w dev i za
// nginx w produkcji. Dev server proxy'uje /sprzet/api do backendu Express, więc
// zachowanie ścieżek (i cookies) jest spójne z tym, co dzieje się za reverse proxy.
export default defineConfig({
  base: '/sprzet/',
  plugins: [react()],
  resolve: {
    alias: {
      // `shared` aliasowane bezpośrednio do źródeł TS (nie do zbudowanego dist/,
      // które jest CommonJS dla wygody `server`). Rollup nie potrafi niezawodnie
      // statycznie przeanalizować nazwanych eksportów w łańcuchach re-eksportów
      // skompilowanych do CJS — aliasując na źródło, esbuild traktuje `shared`
      // jak zwykły kod aplikacji: pełny ESM, bez zgadywania eksportów, plus HMR
      // przy zmianie plików w shared/src bez osobnego kroku builda w dev.
      shared: fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Nasłuch na wszystkich interfejsach (nie tylko localhost) — pozwala otworzyć
    // aplikację z innego urządzenia w tej samej sieci LAN (np. telefonu) pod
    // http://<adres-ip-tego-komputera>:5173/sprzet/. Proxy do API i tak zawsze
    // celuje w localhost:4000, bo działa po stronie procesu Vite, nie klienta.
    host: true,
    proxy: {
      '/sprzet/api': {
        target: 'http://localhost:4000',
      },
    },
  },
});
