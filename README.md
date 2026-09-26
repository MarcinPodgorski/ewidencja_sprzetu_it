# Ewidencja sprzętu IT

Wewnętrzny system do ewidencji sprzętu komputerowego firmy: komputery, monitory,
myszy, klawiatury, telefony, karty SIM, drukarki, tonery, pracownicy oraz konta
aplikacji. Umożliwia przypisywanie sprzętu do pracowników (z pełną historią
przypisań), tworzenie spisów sprzętu per dział z granularnymi uprawnieniami oraz
generowanie protokołów przekazania sprzętu w PDF.

## Stack

- **Backend**: Node.js, Express, TypeScript, Prisma (SQLite)
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router
- **Wspólne**: `shared/` — schematy walidacji Zod i typy współdzielone przez backend i frontend
- **Auth**: JWT w cookie `httpOnly` (sesja bez refresh tokenów, ważność 12h)
- **PDF**: pdfmake (protokoły przekazania sprzętu, font Roboto — pełne wsparcie polskich znaków)

## Model uprawnień (skrót)

- **admin** — pełny dostęp: CRUD całego sprzętu, pracowników, kont aplikacji,
  działów, spisów i uprawnień, generowanie protokołów.
- **user** — brak dostępu domyślnie. Widzi wyłącznie spisy sprzętu, do których
  administrator jawnie nadał uprawnienie: `VIEW` (podgląd pozycji) albo `EDIT`
  (dodatkowo dodawanie/usuwanie pozycji, przez wyszukiwarkę `/equipment/search`).

## Struktura repozytorium

```
sprzet_it/
├── server/     # Express API + Prisma + SQLite
│   ├── prisma/       # schema.prisma, migracje, seed danych demo
│   ├── src/modules/  # moduły domenowe (jeden katalog per zasób REST)
│   ├── src/pdf/       # generowanie protokołu PDF (pdfmake)
│   └── assets/fonts/  # font Roboto do PDF
├── client/     # React SPA (Vite + Tailwind)
│   └── src/features/  # moduły domenowe frontendu (hooki + strony)
├── shared/     # Zod schematy walidacji i wspólne typy/enumy
├── ecosystem.config.js  # konfiguracja PM2 (produkcja)
└── CLAUDE.md   # specyfikacja funkcjonalna projektu
```

## Uruchomienie lokalne (dev)

```bash
npm install
cp .env.example server/.env    # server/.env to realna konfiguracja dev (Prisma i Express jej szukają)
npm run prisma:migrate         # utworzenie bazy SQLite + zastosowanie migracji
npm run prisma:seed            # dane demo (konto admina, przykładowi pracownicy i sprzęt)
npm run dev                    # backend (watch, port 4000) + frontend (Vite dev server, port 5173)
```

Aplikacja w trybie dev dostępna pod `http://localhost:5173/sprzet` (Vite dev
server proxy'uje `/sprzet/api/*` do backendu — zachowanie ścieżek identyczne
jak za reverse proxy w produkcji).

Dane demo z seeda:

| Login       | Hasło      | Rola  | Uwagi                                                    |
|-------------|------------|-------|-----------------------------------------------------------|
| `admin`     | `admin123` | admin | pełny dostęp                                               |
| `akowalska` | `user123`  | user  | uprawnienie VIEW do spisu „Sprzęt działu IT — 2026”        |

**Zmień oba hasła (albo usuń konto testowe) przed wdrożeniem na produkcję.**

## Build produkcyjny

```bash
npm run build                       # buduje shared -> server -> client
npm run prisma:migrate:deploy       # zastosowanie migracji na docelowej bazie (server/.env)
npm start                           # uruchamia server/dist/index.js (serwuje też zbudowany klient)
```

Backend serwuje statyczny build klienta (`client/dist`) i API pod tym samym
procesem/portem — nie trzeba osobnego serwera dla frontendu w produkcji.

## Wdrożenie na Ubuntu (PM2 + nginx)

Zakładana struktura: repozytorium sklonowane np. do `/opt/sprzet-it`, baza SQLite
trzymana **poza repo** w `/var/lib/sprzet-it/`, logi PM2 w `/var/log/sprzet-it/`.

```bash
sudo mkdir -p /var/lib/sprzet-it /var/log/sprzet-it
sudo chown $USER:$USER /var/lib/sprzet-it /var/log/sprzet-it

cd /opt/sprzet-it
npm ci
npm run build
npm run prisma:migrate:deploy   # wymaga DATABASE_URL — patrz niżej

# wygeneruj losowy JWT_SECRET i wklej do ecosystem.config.js:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

pm2 start ecosystem.config.js
pm2 save
pm2 startup   # rejestruje PM2 jako usługę systemd, uruchamianą przy starcie serwera
```

`prisma:migrate:deploy` czyta `DATABASE_URL` z `server/.env` — na serwerze ustaw
tam tę samą wartość, która jest w `ecosystem.config.js` (`file:/var/lib/sprzet-it/sprzet.db`),
tylko na czas uruchomienia migracji (PM2 sam wstrzykuje zmienne środowiskowe
w runtime niezależnie od `.env`).

Po starcie uruchom seed **tylko przy pierwszym wdrożeniu** (tworzy konto admina):

```bash
cd /opt/sprzet-it/server && npx prisma db seed
```

### Konfiguracja nginx

Reverse proxy z czystym passthroughem (bez przepisywania ścieżek — aplikacja
sama jest świadoma prefiksu `/sprzet`, patrz `APP_BASE_PATH`):

```nginx
server {
    listen 80;
    server_name _;

    location /sprzet/ {
        # Domyślnie nginx przyjmuje tylko 1 MB — za mało na załączniki faktur, a tym
        # bardziej na instalatory w katalogu onboardingu (limit aplikacji: 1 GB).
        client_max_body_size 1100m;

        proxy_pass http://127.0.0.1:4000/sprzet/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aplikacja będzie dostępna pod `http://(adres_ip)/sprzet`. Jeśli serwer ma TLS
(zalecane nawet w sieci lokalnej), włącz też `COOKIE_SECURE=true` w
`ecosystem.config.js`, inaczej przeglądarka nie wyśle ciasteczka sesji po HTTPS.

### Backup bazy danych

SQLite — prosty backup przez cron, np. codziennie w nocy:

```bash
sqlite3 /var/lib/sprzet-it/sprzet.db ".backup /var/backups/sprzet-it/sprzet-$(date +\%F).db"
```

Wgrane pliki — załączniki faktur i instalatory z katalogu onboardingu — leżą poza
bazą, w `server/uploads/` (poza repozytorium, `git pull` ich nie rusza). Backupuj je
razem z bazą, np.:

```bash
tar -czf /var/backups/sprzet-it/uploads-$(date +\%F).tar.gz -C /opt/sprzet-it/server uploads
```

### Aktualizacja wdrożenia

```bash
cd /opt/sprzet-it
git pull
npm ci
npm run build
npm run prisma:migrate:deploy
pm2 restart sprzet-it
```

## Zmienne środowiskowe

Patrz `.env.example` — używane przez `server/.env` w dev; w produkcji PM2
wstrzykuje je bezpośrednio przez `env` w `ecosystem.config.js` (plik `.env` nie
jest wtedy wymagany).

| Zmienna          | Opis                                                              |
|------------------|--------------------------------------------------------------------|
| `NODE_ENV`       | `development` / `production`                                       |
| `PORT`           | port, na którym nasłuchuje Express                                 |
| `DATABASE_URL`   | ścieżka do pliku SQLite (`file:...`)                                |
| `JWT_SECRET`     | sekret do podpisywania sesji — **wygeneruj losowy przed produkcją** |
| `COOKIE_SECURE`  | `true` wymaga HTTPS do wysyłania cookie sesji                       |
| `APP_BASE_PATH`  | prefiks ścieżki za reverse proxy (domyślnie `/sprzet`)              |

## Licencja

[WTFPL](LICENSE) (Do What The Fuck You Want To Public License, wersja 2) — z tym kodem
możesz zrobić, co chcesz.
