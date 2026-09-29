# =============================================================================
#  Instalator odczytu cyklicznego — wygenerowany przez aplikację „Ewidencja sprzętu IT”.
#
#  Zakłada zadanie „EwidencjaSprzetu-Odczyt” w Harmonogramie zadań: co tydzień (konto
#  SYSTEM) wysyła dane sprzętu tego komputera do ewidencji. Skrypt zadania z tokenem
#  komputera trafia do C:\ProgramData\EwidencjaSprzetu (dostęp: SYSTEM i Administratorzy).
#  Wymaga uprawnień administratora. Od razu wysyła też pierwszy odczyt.
#
#  Szablon: server/assets/odczyt/instaluj.ps1 — zgodny z Windows PowerShell 5.1.
# =============================================================================

& {
#@KONFIGURACJA@#

    $ErrorActionPreference = 'Stop'
    $ProgressPreference = 'SilentlyContinue'
    try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

#@FUNKCJE_ODCZYTU@#

    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host 'Instalacja odczytu cyklicznego wymaga uprawnień administratora. Uruchom „Terminal (administrator)” i spróbuj ponownie.' -ForegroundColor Red
        return
    }

    Write-Host ''
    Write-Host '=== Odczyt cykliczny do ewidencji ===' -ForegroundColor Cyan
    if ($KomputerWEwidencji) {
        Write-Host ('Komputer w ewidencji: {0}' -f $KomputerWEwidencji)
    }
    try {
        $skrypt = Install-AgentOdczytu -AdresSerwera $AdresSerwera -Token $TokenAgenta
        Write-Host ('Zainstalowano zadanie „EwidencjaSprzetu-Odczyt” (co tydzień w poniedziałek rano) i skrypt {0}.' -f $skrypt) -ForegroundColor Green
    } catch {
        Write-Host ('Nie udało się zainstalować odczytu cyklicznego: {0}' -f $_.Exception.Message) -ForegroundColor Red
        return
    }

    Write-Host 'Wysyłam pierwszy odczyt…'
    try {
        $komunikat = Send-DaneSprzetu -Adres ('{0}/odczyt/agent/{1}' -f $AdresSerwera, $TokenAgenta) -Dane (Get-DaneSprzetu)
        Write-Host $komunikat -ForegroundColor Green
    } catch {
        Write-Host $_.Exception.Message -ForegroundColor Yellow
    }
}
