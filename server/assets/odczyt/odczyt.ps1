# =============================================================================
#  Skrypt odczytu danych komputera — wygenerowany przez aplikację „Ewidencja sprzętu IT”.
#
#  Odczytuje model, numer seryjny, procesor, pamięć, dyski, wersję Windowsa i adresy
#  MAC, po czym wysyła je do ewidencji jako odczyt do przejrzenia. Niczego na komputerze
#  nie zmienia i nie wymaga uprawnień administratora (jako administrator odczyta
#  dokładniej stan BitLockera). Bez połączenia z serwerem zapisze dane w pliku na pulpicie.
#
#  Szablon: server/assets/odczyt/odczyt.ps1 — aplikacja podmienia w nim blok konfiguracji
#  i wkleja funkcje z funkcje.ps1. Kod musi pozostać zgodny z Windows PowerShell 5.1.
# =============================================================================

& {
#@KONFIGURACJA@#

    $ErrorActionPreference = 'Stop'
    $ProgressPreference = 'SilentlyContinue'
    try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

#@FUNKCJE_ODCZYTU@#

    Write-Host ''
    Write-Host '=== Odczyt danych komputera do ewidencji ===' -ForegroundColor Cyan
    if ($KomputerWEwidencji) {
        Write-Host ('Komputer w ewidencji: {0}' -f $KomputerWEwidencji)
    }
    Write-Host 'Zbieram dane…'
    $dane = Get-DaneSprzetu

    $pamiecBajty = 0
    foreach ($modul in $dane.pamiec) { $pamiecBajty += [double]$modul.pojemnosc }
    if ($pamiecBajty -eq 0 -and $dane.ramBajty) { $pamiecBajty = [double]$dane.ramBajty }
    $systemOpis = $null
    if ($dane.system) { $systemOpis = ('{0} {1}' -f $dane.system.nazwa, $dane.system.wersja).Trim() }

    Write-Host ''
    [pscustomobject]@{
        'Nazwa komputera' = $dane.hostname
        'Producent'       = $dane.producent
        'Model'           = $dane.model
        'Numer seryjny'   = $dane.numerSeryjnyBios
        'Procesor'        = $dane.cpu
        'Pamięć'          = ('{0:N0} GB' -f ($pamiecBajty / 1GB))
        'System'          = $systemOpis
        'Karty sieciowe'  = @($dane.karty | ForEach-Object { '{0} ({1})' -f $_.mac, $_.rodzaj }) -join ', '
    } | Format-List | Out-String | Write-Host
    foreach ($blad in $dane.bledy) {
        Write-Host ('Uwaga: nie odczytano — {0}' -f $blad) -ForegroundColor Yellow
    }

    try {
        $komunikat = Send-DaneSprzetu -Adres ('{0}/odczyt/{1}' -f $AdresSerwera, $KodOdczytu) -Dane $dane
        Write-Host $komunikat -ForegroundColor Green
    } catch {
        Write-Host $_.Exception.Message -ForegroundColor Yellow
    }
}
