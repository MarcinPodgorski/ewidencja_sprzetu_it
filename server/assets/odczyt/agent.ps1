# =============================================================================
#  Odczyt cykliczny — skrypt zadania „EwidencjaSprzetu-Odczyt” (Harmonogram zadań, konto
#  SYSTEM). Co tydzień wysyła dane sprzętu tego komputera do aplikacji „Ewidencja sprzętu IT”.
#  Zawiera token tego komputera — nie kopiuj go na inne komputery.
#  Wyłączenie: w aplikacji (karta komputera) albo schtasks /delete /tn EwidencjaSprzetu-Odczyt /f
#
#  Szablon: server/assets/odczyt/agent.ps1 — zgodny z Windows PowerShell 5.1.
# =============================================================================

& {
#@KONFIGURACJA@#

    $ErrorActionPreference = 'Stop'
    $ProgressPreference = 'SilentlyContinue'

#@FUNKCJE_ODCZYTU@#

    try {
        $komunikat = Send-DaneSprzetu -Adres ('{0}/odczyt/agent/{1}' -f $AdresSerwera, $TokenAgenta) -Dane (Get-DaneSprzetu) -BezPliku
    } catch {
        $komunikat = 'BŁĄD: ' + $_.Exception.Message
    }

    # Dziennik z ostatnimi 100 wpisami — do sprawdzenia na komputerze, gdy odczyty przestaną przychodzić.
    $dziennik = Join-Path $env:ProgramData 'EwidencjaSprzetu\odczyt.log'
    $wpisy = @()
    if (Test-Path -LiteralPath $dziennik) {
        $wpisy = @(Get-Content -LiteralPath $dziennik -Encoding UTF8 | Select-Object -Last 99)
    }
    $wpisy += ('{0:yyyy-MM-dd HH:mm} {1}' -f (Get-Date), $komunikat)
    Set-Content -LiteralPath $dziennik -Value $wpisy -Encoding UTF8
}
