# =============================================================================
#  Skrypt onboardingu komputera — wygenerowany przez aplikację „Ewidencja sprzętu IT”.
#
#  Uruchom w PowerShellu jako administrator (Start > prawy przycisk >
#  „Terminal (administrator)”). Wymaga Windows PowerShell 5.1 (wbudowany
#  w Windows 11) i połączenia z internetem. Log trafia do C:\ProgramData\Onboarding.
#
#  Szablon: server/assets/onboarding/onboarding.ps1 — aplikacja podmienia w nim
#  wyłącznie blok konfiguracji (znacznik poniżej). Kod musi pozostać zgodny
#  z Windows PowerShell 5.1: bez operatorów ?:, ??, && itp. z PowerShell 7.
# =============================================================================

& {
#@KONFIGURACJA@#

    $ErrorActionPreference = 'Stop'
    $ProgressPreference = 'SilentlyContinue'   # pasek postępu drastycznie spowalnia pobieranie w PS 5.1
    try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

    # ------------------------------------------------------------------------
    # Sprawdzenia wstępne
    # ------------------------------------------------------------------------
    $tozsamosc = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($tozsamosc)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host 'Ten skrypt wymaga uprawnień administratora. Uruchom „Terminal (administrator)” i spróbuj ponownie.' -ForegroundColor Red
        return
    }

    $infoSystemu = Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
    $edycja = [string]$infoSystemu.EditionID
    $jestHome = $edycja -like 'Core*'   # Core, CoreSingleLanguage, CoreN… = edycje Home

    Write-Host ''
    Write-Host '=== Onboarding komputera ===' -ForegroundColor Cyan
    Write-Host ('Komputer:   {0} > {1}' -f $env:COMPUTERNAME, $NazwaKomputera)
    Write-Host ('Pracownik:  {0}' -f $ImieNazwisko)
    Write-Host ('Tryb:       {0} (wykryta edycja Windows: {1})' -f $TrybOpis, $edycja)
    Write-Host ''

    if ([int]$infoSystemu.CurrentBuildNumber -lt 22000) {
        Write-Host 'Uwaga: to nie jest Windows 11 — część kroków może nie zadziałać.' -ForegroundColor Yellow
    }
    if ($Tryb -eq 'PRO' -and $jestHome) {
        Write-Host 'Uwaga: skrypt przygotowano dla Windows 11 Pro, a to jest edycja Home. Logowanie kontem Microsoft 365 nie będzie możliwe — wygeneruj skrypt w trybie Home.' -ForegroundColor Yellow
    }
    if ($Tryb -eq 'HOME' -and -not $jestHome) {
        Write-Host 'Uwaga: skrypt przygotowano dla Windows 11 Home, a to nie jest edycja Home. Rozważ tryb Pro (logowanie kontem Microsoft 365).' -ForegroundColor Yellow
    }
    if ($Tryb -eq 'PRO') {
        $statusUrzadzenia = (& dsregcmd.exe /status) | Out-String
        if ($statusUrzadzenia -notmatch 'AzureAdJoined\s*:\s*YES') {
            Write-Host 'Uwaga: komputer nie jest dołączony do Microsoft Entra ID, więc pracownik nie zaloguje się kontem Microsoft 365.' -ForegroundColor Yellow
            Write-Host '       Dołącz go: Ustawienia > Konta > Dostęp do konta służbowego lub szkolnego > Połącz > dołączenie do Microsoft Entra ID.' -ForegroundColor Yellow
        }
    }

    $odpowiedz = Read-Host 'Kontynuować? (T/N)'
    if ($odpowiedz -notmatch '^[TtYy]') {
        Write-Host 'Przerwano — nic nie zostało zmienione.'
        return
    }

    $katalogRoboczy = Join-Path $env:ProgramData 'Onboarding'
    New-Item -ItemType Directory -Path $katalogRoboczy -Force | Out-Null
    $plikLogu = Join-Path $katalogRoboczy ('onboarding-{0}.log' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
    try { Start-Transcript -Path $plikLogu | Out-Null } catch { }

    # ------------------------------------------------------------------------
    # Narzędzia
    # ------------------------------------------------------------------------
    $wyniki = New-Object System.Collections.Generic.List[object]
    $stan = @{ Restart = $false; Winget = $null }

    # Wykonuje jeden krok: błąd w kroku nie przerywa całego skryptu, tylko trafia
    # do podsumowania. Krok może zwrócić tekst statusu (np. 'OK — był już zainstalowany').
    function Invoke-Krok {
        param([string]$Nazwa, [scriptblock]$Akcja)
        Write-Host ''
        Write-Host ('==> {0}' -f $Nazwa) -ForegroundColor Cyan
        try {
            $wynik = & $Akcja
            $status = 'OK'
            if ($wynik) { $status = [string]($wynik | Select-Object -Last 1) }
            Write-Host ('    {0}' -f $status) -ForegroundColor Green
            $wyniki.Add([pscustomobject]@{ Krok = $Nazwa; Wynik = $status })
        } catch {
            $blad = $_.Exception.Message
            Write-Host ('    BŁĄD: {0}' -f $blad) -ForegroundColor Red
            $wyniki.Add([pscustomobject]@{ Krok = $Nazwa; Wynik = ('BŁĄD: {0}' -f $blad) })
        }
    }

    function Find-Winget {
        $polecenie = Get-Command -Name 'winget.exe' -ErrorAction SilentlyContinue
        if ($polecenie) { return $polecenie.Source }
        # Fallback: bezpośrednio z katalogu pakietu (alias winget.exe bywa niezarejestrowany
        # na świeżym systemie, zanim Instalator aplikacji zaktualizuje się ze Sklepu).
        $katalogi = @(Get-ChildItem -Path (Join-Path $env:ProgramFiles 'WindowsApps') -Filter 'Microsoft.DesktopAppInstaller_*' -Directory -ErrorAction SilentlyContinue |
            Sort-Object -Property Name -Descending)
        foreach ($katalog in $katalogi) {
            $exe = Join-Path $katalog.FullName 'winget.exe'
            if (Test-Path $exe) { return $exe }
        }
        return $null
    }

    function Install-ProgramWinget {
        param([string]$WingetExe, [string]$Id)
        $argumenty = @('install', '--id', $Id, '--exact', '--silent', '--source', 'winget',
            '--accept-package-agreements', '--accept-source-agreements')
        # Najpierw „dla wszystkich użytkowników” — skrypt działa na koncie IT, a program
        # ma zobaczyć pracownik logujący się później na swoje konto.
        & $WingetExe @argumenty --scope machine | Out-Host
        $kod = $LASTEXITCODE
        if ($kod -eq -1978335212) {
            # 0x8A150014: brak instalatora z zakresem „machine” — instalacja bez wymuszania zakresu.
            Write-Host '    Brak wersji instalowanej dla wszystkich użytkowników — instaluję bez wymuszania zakresu.' -ForegroundColor Yellow
            & $WingetExe @argumenty | Out-Host
            $kod = $LASTEXITCODE
            if ($kod -eq 0) { return 'OK — możliwe, że tylko dla bieżącego konta (sprawdź na koncie pracownika)' }
        }
        if ($kod -eq 0) { return 'OK' }
        # 0x8A15002B: brak nowszej wersji, 0x8A150061: pakiet już zainstalowany.
        if ($kod -eq -1978335189 -or $kod -eq -1978335135) { return 'OK — był już zainstalowany' }
        throw ('winget zakończył się kodem {0}' -f $kod)
    }

    # Instalator z katalogu aplikacji: najpierw szukany obok skryptu (wariant z pendrive'em),
    # potem pobierany z serwera kodem skryptu. Suma SHA-256 z migawki chroni przed uszkodzonym
    # pobraniem i przed plikiem podmienionym w katalogu już po wygenerowaniu skryptu.
    function Get-Instalator {
        param([hashtable]$Program)
        $sciezka = $null
        if ($PSScriptRoot) {
            $obokSkryptu = Join-Path $PSScriptRoot $Program.Plik
            if (Test-Path -LiteralPath $obokSkryptu) {
                Write-Host ('    Używam pliku obok skryptu: {0}' -f $obokSkryptu)
                $sciezka = $obokSkryptu
            }
        }
        if (-not $sciezka) {
            $katalog = Join-Path $katalogRoboczy 'Instalatory'
            New-Item -ItemType Directory -Path $katalog -Force | Out-Null
            $sciezka = Join-Path $katalog $Program.Plik
            $adres = '{0}/start/{1}/pliki/{2}' -f $AdresSerwera, $KodSkryptu, $Program.Id
            Write-Host ('    Pobieranie {0} ({1:N1} MB)…' -f $Program.Plik, ($Program.Rozmiar / 1MB))
            try {
                Invoke-WebRequest -Uri $adres -OutFile $sciezka -UseBasicParsing
            } catch {
                throw ('Nie udało się pobrać instalatora ({0}). Jeśli kod skryptu wygasł, skopiuj plik „{1}” obok skryptu albo wygeneruj nowy skrypt.' -f $_.Exception.Message, $Program.Plik)
            }
        }
        $suma = (Get-FileHash -LiteralPath $sciezka -Algorithm SHA256).Hash
        if ($suma -ne $Program.Sha256) {
            throw ('Suma kontrolna pliku „{0}” się nie zgadza — plik jest uszkodzony albo podmieniono go w katalogu po wygenerowaniu skryptu (wygeneruj skrypt ponownie).' -f $Program.Plik)
        }
        # Plik pobrany przeglądarką i skopiowany na pendrive może mieć znacznik „z internetu”
        # (Zone.Identifier) — Windows zatrzymałby wtedy instalację pytaniem o zgodę.
        Unblock-File -LiteralPath $sciezka
        return $sciezka
    }

    function Install-ProgramZPliku {
        param([hashtable]$Program)
        $sciezka = Get-Instalator -Program $Program
        $argumenty = [string]$Program.Argumenty
        $parametry = @{ Wait = $true; PassThru = $true }
        switch ([IO.Path]::GetExtension($sciezka).ToLowerInvariant()) {
            '.msi' {
                $parametry.FilePath = 'msiexec.exe'
                $parametry.ArgumentList = ('/i "{0}" {1}' -f $sciezka, $argumenty).Trim()
            }
            '.ps1' {
                $parametry.FilePath = 'powershell.exe'
                $parametry.ArgumentList = ('-NoProfile -ExecutionPolicy Bypass -File "{0}" {1}' -f $sciezka, $argumenty).Trim()
            }
            default {
                # .exe, .bat, .cmd — Start-Process uruchamia je bezpośrednio (wsad przez cmd.exe).
                $parametry.FilePath = $sciezka
                if ($argumenty) { $parametry.ArgumentList = $argumenty }
            }
        }
        Write-Host ('    Uruchamiam: {0} {1}' -f $parametry.FilePath, $parametry.ArgumentList)
        $proces = Start-Process @parametry
        $kod = $proces.ExitCode
        if ($kod -eq 0) { return 'OK' }
        # 3010 = sukces, potrzebny restart; 1641 = instalator sam zainicjował restart.
        if ($kod -eq 3010 -or $kod -eq 1641) {
            $stan.Restart = $true
            return 'OK — wymaga restartu'
        }
        throw ('Instalator zakończył się kodem {0}' -f $kod)
    }

    function Test-HaslaRowne {
        param([Security.SecureString]$Pierwsze, [Security.SecureString]$Drugie)
        $bstr1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Pierwsze)
        $bstr2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Drugie)
        try {
            return ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr1) -ceq [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr2))
        } finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr1)
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr2)
        }
    }

#@FUNKCJE_ODCZYTU@#

    try {
        # --------------------------------------------------------------------
        # 1. Komunikat przy logowaniu (okno przed zalogowaniem — działa też w Home)
        # --------------------------------------------------------------------
        if ($KomunikatTytul) {
            Invoke-Krok 'Komunikat przy logowaniu' {
                $klucz = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System'
                Set-ItemProperty -Path $klucz -Name 'legalnoticecaption' -Value $KomunikatTytul
                Set-ItemProperty -Path $klucz -Name 'legalnoticetext' -Value $KomunikatTresc
            }
        }

        # --------------------------------------------------------------------
        # 2. Programy z katalogu: pakiety winget i pliki instalacyjne z aplikacji
        # --------------------------------------------------------------------
        if ($Programy.Count -gt 0) {
            $programyWinget = @($Programy | Where-Object { $_.Typ -eq 'WINGET' })
            if ($programyWinget.Count -gt 0) {
                Invoke-Krok 'Menedżer pakietów winget' {
                    $sciezka = Find-Winget
                    if (-not $sciezka) {
                        Write-Host '    winget niedostępny — rejestruję Instalator aplikacji i czekam (do 2 minut)…'
                        try { Add-AppxPackage -RegisterByFamilyName -MainPackage 'Microsoft.DesktopAppInstaller_8wekyb3d8bbwe' } catch { }
                        for ($proba = 0; $proba -lt 12 -and -not $sciezka; $proba++) {
                            Start-Sleep -Seconds 10
                            $sciezka = Find-Winget
                        }
                    }
                    if (-not $sciezka) {
                        throw 'Nie znaleziono winget. Otwórz Microsoft Store, zaktualizuj „Instalator aplikacji” i uruchom skrypt ponownie.'
                    }
                    $stan.Winget = $sciezka
                }
            }

            foreach ($program in $Programy) {
                $nazwaKroku = 'Instalacja: {0}' -f $program.Nazwa
                if ($program.Typ -eq 'PLIK') {
                    Invoke-Krok $nazwaKroku {
                        Install-ProgramZPliku -Program $program
                    }
                    continue
                }
                if (-not $stan.Winget) {
                    $wyniki.Add([pscustomobject]@{ Krok = $nazwaKroku; Wynik = 'POMINIĘTO — brak winget' })
                    continue
                }
                Invoke-Krok $nazwaKroku {
                    Install-ProgramWinget -WingetExe $stan.Winget -Id $program.WingetId
                }
            }
        }

        # --------------------------------------------------------------------
        # 3. Microsoft 365 Apps (Office Deployment Tool) — licencje z aplikacjami
        #    desktopowymi (np. Business Standard); Business Basic ich nie obejmuje.
        # --------------------------------------------------------------------
        if ($InstalujM365Apps) {
            Invoke-Krok 'Instalacja: Microsoft 365 Apps (Word, Excel, PowerPoint, Outlook)' {
                $katalogOdt = Join-Path $katalogRoboczy 'ODT'
                New-Item -ItemType Directory -Path $katalogOdt -Force | Out-Null
                $setupExe = Join-Path $katalogOdt 'setup.exe'
                [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
                Invoke-WebRequest -Uri 'https://officecdn.microsoft.com/pr/wsus/setup.exe' -OutFile $setupExe -UseBasicParsing
                $plikKonfiguracji = Join-Path $katalogOdt 'konfiguracja.xml'
                Set-Content -Path $plikKonfiguracji -Encoding UTF8 -Value @'
<Configuration>
  <Add OfficeClientEdition="64" Channel="Current">
    <Product ID="O365BusinessRetail">
      <Language ID="pl-pl" />
      <ExcludeApp ID="Groove" />
      <ExcludeApp ID="Lync" />
    </Product>
  </Add>
  <Updates Enabled="TRUE" />
  <Display Level="None" AcceptEULA="TRUE" />
</Configuration>
'@
                Write-Host '    Pobieranie i instalacja zwykle trwa kilkanaście minut…'
                $proces = Start-Process -FilePath $setupExe -ArgumentList @('/configure', ('"{0}"' -f $plikKonfiguracji)) -Wait -PassThru
                if ($proces.ExitCode -ne 0) {
                    throw ('Office Deployment Tool zakończył się kodem {0}' -f $proces.ExitCode)
                }
            }
        }

        # --------------------------------------------------------------------
        # 4a. Tryb Home: lokalne konto pracownika + przypomnienie o Microsoft 365
        # --------------------------------------------------------------------
        if ($Tryb -eq 'HOME') {
            Invoke-Krok ('Konto lokalne pracownika: {0}' -f $LoginLokalny) {
                if (Get-LocalUser -Name $LoginLokalny -ErrorAction SilentlyContinue) {
                    return 'OK — konto już istniało, pominięto'
                }
                Write-Host ('    Podaj hasło początkowe dla konta {0} — pracownik zmieni je przy pierwszym logowaniu.' -f $LoginLokalny)
                $haslo = Read-Host -AsSecureString '    Hasło'
                $powtorzone = Read-Host -AsSecureString '    Powtórz hasło'
                if ($haslo.Length -eq 0) { throw 'Hasło nie może być puste' }
                if (-not (Test-HaslaRowne $haslo $powtorzone)) { throw 'Hasła nie są identyczne — uruchom skrypt ponownie' }
                New-LocalUser -Name $LoginLokalny -FullName $ImieNazwisko -Password $haslo -Description 'Konto pracownika (onboarding)' | Out-Null
                # Grupa „Użytkownicy” po SID — nazwa grupy zależy od języka Windowsa.
                Add-LocalGroupMember -SID 'S-1-5-32-545' -Member $LoginLokalny
                & net.exe user $LoginLokalny /logonpasswordchg:yes | Out-Null
                if ($LASTEXITCODE -ne 0) { return 'OK — ale nie udało się wymusić zmiany hasła przy pierwszym logowaniu' }
            }

            if ($KomunikatM365) {
                Invoke-Krok 'Przypomnienie o połączeniu z Microsoft 365 (przy logowaniu pracownika)' {
                    $plikKomunikatu = Join-Path $katalogRoboczy 'm365-komunikat.txt'
                    $plikPrzypomnienia = Join-Path $katalogRoboczy 'm365-przypomnienie.ps1'
                    Set-Content -Path $plikKomunikatu -Encoding UTF8 -Value $KomunikatM365
                    Set-Content -Path $plikPrzypomnienia -Encoding UTF8 -Value @'
# Przypomnienie o połączeniu komputera z kontem Microsoft 365. Uruchamiane przy każdym
# logowaniu pracownika, dopóki konto służbowe nie zostanie dodane (WorkplaceJoined = YES).
$ErrorActionPreference = 'SilentlyContinue'
Start-Sleep -Seconds 15
$status = (& dsregcmd.exe /status) | Out-String
if ($status -match 'WorkplaceJoined\s*:\s*YES') { return }
$tekst = Get-Content -Path (Join-Path $PSScriptRoot 'm365-komunikat.txt') -Raw -Encoding UTF8
Add-Type -AssemblyName PresentationFramework
[System.Windows.MessageBox]::Show($tekst, 'Microsoft 365', 'OK', 'Information') | Out-Null
Start-Process 'ms-settings:workplace'
'@
                    $akcja = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $plikPrzypomnienia)
                    $wyzwalacz = New-ScheduledTaskTrigger -AtLogOn -User $LoginLokalny
                    $uzytkownik = New-ScheduledTaskPrincipal -UserId $LoginLokalny -LogonType Interactive -RunLevel Limited
                    # Domyślnie zadania nie startują na baterii — na laptopie to by blokowało przypomnienie.
                    $ustawienia = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
                    Register-ScheduledTask -TaskName 'Onboarding - Microsoft 365' -Action $akcja -Trigger $wyzwalacz -Principal $uzytkownik -Settings $ustawienia -Force | Out-Null
                }
            }
        }

        # --------------------------------------------------------------------
        # 4b. Tryb Pro: ciche logowanie OneDrive kontem, którym pracownik
        #     zaloguje się do Windowsa (wymaga dołączenia do Entra ID)
        # --------------------------------------------------------------------
        if ($Tryb -eq 'PRO') {
            Invoke-Krok 'OneDrive: automatyczne logowanie kontem Microsoft 365' {
                $klucz = 'HKLM:\SOFTWARE\Policies\Microsoft\OneDrive'
                if (-not (Test-Path $klucz)) { New-Item -Path $klucz | Out-Null }
                New-ItemProperty -Path $klucz -Name 'SilentAccountConfig' -Value 1 -PropertyType DWord -Force | Out-Null
            }
        }

        # --------------------------------------------------------------------
        # 5. Dane sprzętu do ewidencji (model, numer seryjny, pamięć, MAC…) —
        #    trafiają do aplikacji jako odczyt do przejrzenia, nic nie nadpisuje się samo
        # --------------------------------------------------------------------
        Invoke-Krok 'Dane sprzętu do ewidencji' {
            Send-DaneSprzetu -Adres ('{0}/start/{1}/odczyt' -f $AdresSerwera, $KodSkryptu) -Dane (Get-DaneSprzetu)
        }

        # --------------------------------------------------------------------
        # 6. Nazwa komputera (na końcu — wymaga restartu)
        # --------------------------------------------------------------------
        Invoke-Krok ('Nazwa komputera: {0}' -f $NazwaKomputera) {
            if ($env:COMPUTERNAME -eq $NazwaKomputera) { return 'OK — nazwa już ustawiona' }
            $oczekujaca = (Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\ComputerName\ComputerName').ComputerName
            if ($oczekujaca -eq $NazwaKomputera) {
                $stan.Restart = $true
                return 'OK — zmiana czeka na restart'
            }
            Rename-Computer -NewName $NazwaKomputera -Force -WarningAction SilentlyContinue
            $stan.Restart = $true
            'OK — nowa nazwa zadziała po restarcie'
        }

        # --------------------------------------------------------------------
        # Podsumowanie
        # --------------------------------------------------------------------
        Write-Host ''
        Write-Host '=== Podsumowanie ===' -ForegroundColor Cyan
        $wyniki | Format-Table -AutoSize -Wrap | Out-String -Width 200 | Write-Host
        if ($Tryb -eq 'HOME') {
            Write-Host ('Pracownik loguje się na konto „{0}” — przy pierwszym logowaniu ustawi własne hasło.' -f $LoginLokalny)
            if ($KomunikatM365) {
                Write-Host 'Po zalogowaniu Windows poprosi go o połączenie z kontem Microsoft 365.'
            }
        } else {
            $loginM365 = 'swoim kontem Microsoft 365'
            if ($EmailM365) { $loginM365 = $EmailM365 }
            Write-Host ('Pracownik wybiera na ekranie logowania „Inny użytkownik” i loguje się jako: {0}' -f $loginM365)
        }
        Write-Host ('Log: {0}' -f $plikLogu)
    } finally {
        try { Stop-Transcript | Out-Null } catch { }
    }

    if ($stan.Restart) {
        Write-Host ''
        $restart = Read-Host 'Zmiana nazwy komputera wymaga restartu. Zrestartować teraz? (T/N)'
        if ($restart -match '^[TtYy]') { Restart-Computer -Force }
    }
}
