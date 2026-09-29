# Ewidencja sprzętu IT

Wewnętrzny system do ewidencji sprzętu komputerowego firmy: komputery, monitory,
myszy, klawiatury, telefony, karty SIM, drukarki, tonery, pracownicy oraz konta
aplikacji. Umożliwia przypisywanie sprzętu do pracowników (z pełną historią
przypisań), tworzenie spisów sprzętu per dział z granularnymi uprawnieniami oraz
generowanie protokołów przekazania i zwrotu sprzętu w PDF.

Narzędzia dla działu IT:

- **Onboarding** — skrypt PowerShell konfigurujący nowy laptop (Windows 11 Home/Pro,
  programy z winget i własnych instalatorów, konto pracownika, Microsoft 365).
- **Odczyt sprzętu** — jednolinijkowiec odczytujący z komputera model, numer seryjny,
  CPU, RAM, dyski, wersję Windowsa i adresy MAC; dane czekają na zatwierdzenie
  w aplikacji (porównanie z ewidencją albo nowy komputer). Opcjonalnie co tydzień
  (zadanie w Harmonogramie zadań) — do przejrzenia trafiają tylko nowe różnice.
- **Stan floty** — Windows 10 bez wsparcia, dyski bez BitLockera, Windows Pro bez
  Entra ID, kończące się gwarancje, sprzęt do wymiany i komputery bez aktualnego odczytu.
  Sekcję, której dział IT nie śledzi, można ukryć — znika też z licznika na pulpicie.
- **Historia zmian** — kto, kiedy i co zmienił w karcie sprzętu i pracownika
  (PIN-y, PUK-i i kody odblokowania są maskowane).
- **Odejście pracownika** — zwrot sprzętu z protokołem PDF, dezaktywacja i lista
  kontrolna (M365, reset sprzętu, karta SIM).
- **Etykiety QR i inwentaryzacja** — naklejki z kodem prowadzącym do karty sprzętu
  i spis z natury: skan telefonem potwierdza obecność, raport braków w PDF.
- **Wyszukiwarka (Ctrl+K / ⌘K)** — cała ewidencja naraz: numery ewidencyjne i seryjne,
  modele, MAC (w dowolnym zapisie), IMEI, numery telefonów, nazwiska, faktury, spisy —
  także bez polskich znaków; do tego szybkie przejście do stron i formularzy.
- **Import z Excela** — wklejone komórki albo plik CSV (UTF-8 lub Windows-1250): kolumny
  dopasowują się po nagłówkach, podgląd pokazuje, jak zrozumiano każdy wiersz („16 GB DDR4”,
  „Windows 11 Pro”, „5 999,00 zł”, przypisanie po nazwisku), duplikaty są wykrywane,
  a przed zapisem powstaje kopia zapasowa. Pracownicy, komputery, monitory, myszy,
  klawiatury, telefony, karty SIM i drukarki.
- **Kopie zapasowe** — codziennie, przed każdym importem i na żądanie; do pobrania z aplikacji.

Interfejs działa też na telefonie: menu wysuwane spod ☰, tabele przewijane w poziomie,
wyszukiwarka pod ikoną lupy.

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
- **bez logowania** — wyłącznie jednolinijkowce PowerShella uruchamiane na komputerach:
  `/sprzet/api/start/<kod>` (onboarding), `/sprzet/api/odczyt/<kod>` (odczyt sprzętu)
  i `/sprzet/api/odczyt/<kod>/instaluj` (instalator odczytu cyklicznego). Chroni je
  krótkotrwały, losowy kod generowany w aplikacji; odczyt sprzętu i tak niczego nie zapisuje
  w ewidencji bez zatwierdzenia przez admina.
- **zadanie odczytu cyklicznego** — `/sprzet/api/odczyt/agent/<token>`: stały, losowy
  token jednego komputera (32 znaki), który pozwala tylko wysłać odczyt. Wyłączenie odczytu
  cyklicznego na karcie komputera od razu unieważnia token.

## Odczyt cykliczny

Na karcie komputera („Włącz odczyt cykliczny”) albo w Narzędzia → Odczyt sprzętu aplikacja
podaje polecenie do uruchomienia w Terminalu jako administrator; skrypt onboardingu instaluje
odczyt cykliczny sam (opcja domyślnie włączona). Instalator zapisuje skrypt
`C:\ProgramData\EwidencjaSprzetu\odczyt.ps1` (dostęp tylko SYSTEM i Administratorzy) i zadanie
`EwidencjaSprzetu-Odczyt`: co tydzień w poniedziałek od 10:00 (z losowym opóźnieniem do 3 h),
na koncie SYSTEM, nadrabiane po włączeniu komputera. Dziennik ostatnich uruchomień:
`C:\ProgramData\EwidencjaSprzetu\odczyt.log`.

- Odczyt bez nowych różnic dostaje status „bez zmian” — odnotowuje, że komputer działa
  (i np. stan BitLockera na Stanie floty), ale nie trzeba go przeglądać.
- Różnica, której admin świadomie nie zapisał (pole odznaczone albo poprawione przed
  zapisem), nie wraca w kolejnych odczytach — dopóki komputer nie poda w tym polu innej wartości.
- Skrypt działa lokalnie i nie pobiera kodu z serwera przy każdym uruchomieniu (zadanie ma
  uprawnienia SYSTEM). Po zmianie adresu serwera albo żeby wgrać nowszą wersję skryptu,
  uruchom polecenie instalacyjne ponownie — poprzedni token zostanie wyłączony.

Odinstalowanie na komputerze (Terminal jako administrator), po wyłączeniu w aplikacji:

```powershell
schtasks /delete /tn EwidencjaSprzetu-Odczyt /f
Remove-Item -Recurse -Force C:\ProgramData\EwidencjaSprzetu
```

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

### Dodawanie zależności npm

npm 11 ma błąd: `npm install <pakiet>` przy istniejącym `package-lock.json` usuwa z niego
wpisy platformowe esbuilda (`@esbuild/*`, wymagane przez `tsx`), przez co instalacja
na innym systemie — np. `npm ci` na serwerze Ubuntu — musiałaby dociągać binarkę awaryjnie.
Po zmianie zależności wygeneruj lockfile od zera i sprawdź, że wpisy wróciły:

```bash
rm -rf node_modules */node_modules package-lock.json
npm install
grep -c '"node_modules/@esbuild/' package-lock.json   # oczekiwane: 26 (0 = lockfile uszkodzony)
```

Sam `npm ci` (instalacja z lockfile, także przy wdrożeniu) działa poprawnie.

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

Przy pierwszym starcie na pustej bazie aplikacja sama zakłada konto administratora
(login `admin`) i wypisuje jego losowe hasło w logu (`pm2 logs sprzet-it`) — hasło można też
podać z góry w `INITIAL_ADMIN_PASSWORD`. **Nie uruchamiaj w produkcji `prisma db seed`**: to dane
demo, które czyszczą całą bazę (przy `NODE_ENV=production` skrypt odmawia działania).

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

### Kopie zapasowe

Aplikacja sama robi kopie (Administracja → Kopie zapasowe): codziennie o `BACKUP_HOUR`
(domyślnie 2:00), przed każdym importem z Excela i na żądanie. Kopia to katalog `BACKUP_DIR/RRRR-MM-DD_GG-MM-SS/` z bazą
(`baza.db`, spójna kopia przez `VACUUM INTO` — bez zatrzymywania aplikacji) oraz wgranymi
plikami (`uploads/`: załączniki faktur i instalatory). Pliki są twardo dowiązywane, więc
niezmieniony instalator nie zajmuje miejsca w każdej kopii osobno — pod warunkiem, że
`BACKUP_DIR` leży na tym samym systemie plików co `server/uploads` (inaczej są kopiowane).
Kopie starsze niż `BACKUP_RETENTION_DAYS` są usuwane (trzy najnowsze zostają zawsze).
W aplikacji każdą kopię można pobrać — samą bazę albo całość jako `.tar.gz`.

```bash
sudo mkdir -p /var/backups/sprzet-it && sudo chown <user>:<user> /var/backups/sprzet-it
sudo chmod 700 /var/backups/sprzet-it   # kopie zawierają całą bazę (m.in. PIN-y kart SIM)
```

Kopie leżą na tym samym serwerze — nie chronią przed awarią dysku. Kopiuj je dalej, np.
cron po godzinie kopii: `30 2 * * * rsync -a --delete /var/backups/sprzet-it/ nas:/kopie/sprzet-it/`.

Przywracanie (strona w aplikacji pokazuje te polecenia z właściwymi ścieżkami):

```bash
pm2 stop sprzet-it
cp /var/backups/sprzet-it/<kopia>/baza.db /var/lib/sprzet-it/sprzet.db
rm -f /var/lib/sprzet-it/sprzet.db-wal /var/lib/sprzet-it/sprzet.db-shm
rsync -a --delete /var/backups/sprzet-it/<kopia>/uploads/ /opt/sprzet-it/server/uploads/
pm2 start sprzet-it
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

## Docker (np. na Proxmoxie)

Na Proxmoxie kontenery Dockera najlepiej uruchamiać w maszynie wirtualnej — tak zaleca
dokumentacja Proxmox (Docker w kontenerze LXC działa, ale bywa kłopotliwy przy aktualizacjach).
Wystarczy mała VM: Debian 13, 2 vCPU, 2 GB RAM (głównie na budowanie obrazu), 20 GB dysku,
sieć przez most `vmbr0` z adresem z LAN. W VM zainstaluj Docker Engine
z wtyczką compose (https://docs.docker.com/engine/install/debian/), a potem:

```bash
git clone <adres-repozytorium> /opt/sprzet-it && cd /opt/sprzet-it
echo "JWT_SECRET=$(openssl rand -hex 48)" > .env
docker compose up -d --build
docker compose logs sprzet-it     # login „admin” i hasło pierwszego konta
```

Aplikacja jest pod `http://<adres-VM>/sprzet` (inny port: `HTTP_PORT=8080` w `.env`). W `.env`
możesz też ustawić `INITIAL_ADMIN_PASSWORD` (hasło pierwszego admina zamiast losowego),
`BACKUP_HOUR` i `BACKUP_RETENTION_DAYS`. Obraz sam wykonuje migracje bazy przy każdym starcie,
działa na koncie bez uprawnień roota, a restartami zajmuje się Docker (`restart: unless-stopped`) —
PM2 i nginx nie są potrzebne.

**Dane** leżą w wolumenie `sprzet-it-dane` (w kontenerze `/data`, w VM
`/var/lib/docker/volumes/sprzet-it-dane/_data`): baza `sprzet.db`, załączniki i instalatory
(`uploads/`) oraz kopie zapasowe (`backups/`, automatycznie codziennie o 2:00). Kopie w tym samym
wolumenie nie chronią przed awarią dysku — włącz też kopie całej VM w Proxmoxie (Datacenter →
Backup) albo kopiuj katalog `backups/` na NAS.

**Aktualizacja:** `git pull && docker compose up -d --build`, potem `docker image prune -f`
(usuwa poprzednie wersje obrazu).

**Przywracanie kopii** (strona Kopie zapasowe pokazuje te polecenia z nazwą najnowszej kopii):

```bash
docker compose stop sprzet-it
docker compose run --rm --entrypoint sh sprzet-it -c 'K=/data/backups/<kopia> && \
  cp $K/baza.db /data/sprzet.db && rm -f /data/sprzet.db-wal /data/sprzet.db-shm && \
  rm -rf /data/uploads && cp -a $K/uploads /data/uploads'
docker compose start sprzet-it
```

**HTTPS / domena:** postaw przed kontenerem reverse proxy (np. Nginx Proxy Manager albo Caddy)
kierujące na port aplikacji i ustaw `COOKIE_SECURE=true` w `.env`. Nagłówki `X-Forwarded-*` są
uwzględniane, więc skrypty onboardingu i odczytu dostaną właściwy adres serwera.

Lżejsza alternatywa bez Dockera: kontener LXC z Debianem i instalacja jak w sekcji
„Wdrożenie na Ubuntu (PM2 + nginx)”.

**Próba na własnym komputerze (Docker Desktop):** te same polecenia, najlepiej z
`HTTP_PORT=8080` w `.env` — aplikacja będzie pod `http://localhost:8080/sprzet`. Po instalacji
Docker Desktop otwórz nowe okno terminala (instalator dopisuje swoje narzędzia do `PATH`),
inaczej budowanie kończy się błędem `docker-credential-desktop: executable file not found`.
Usunięcie próby razem z danymi: `docker compose down -v`.

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
| `BACKUP_DIR`     | katalog kopii zapasowych (domyślnie `server/backups`)               |
| `BACKUP_RETENTION_DAYS` | ile dni przechowywać kopie (domyślnie 30)                    |
| `BACKUP_HOUR`    | godzina automatycznej kopii, czas lokalny (domyślnie 2)             |
| `BACKUP_AUTO`    | `true`/`false` — automatyczne kopie (domyślnie tylko w produkcji)   |
| `UPLOADS_DIR`    | katalog wgranych plików (domyślnie `server/uploads`; w Dockerze `/data/uploads`) |
| `INITIAL_ADMIN_PASSWORD` | hasło konta `admin` zakładanego na pustej bazie (brak = losowe, w logu) |

## Licencja

[WTFPL](LICENSE) (Do What The Fuck You Want To Public License, wersja 2) — z tym kodem
możesz zrobić, co chcesz.
