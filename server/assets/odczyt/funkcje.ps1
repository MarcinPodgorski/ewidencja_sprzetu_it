    # ------------------------------------------------------------------------
    # Odczyt danych sprzętowych — funkcje wspólne dla skryptu odczytu i skryptu
    # onboardingu (szablon: server/assets/odczyt/funkcje.ps1, wklejany w miejsce
    # znacznika). Nie wymagają uprawnień administratora. Każdy element jest
    # odczytywany osobno: błąd jednego nie przerywa reszty, tylko trafia do „bledy”.
    # ------------------------------------------------------------------------
    function Get-DaneSprzetu {
        $dane = [ordered]@{
            wersjaSkryptu        = 1
            hostname             = $env:COMPUTERNAME
            zalogowanyUzytkownik = $null
            producent            = $null
            model                = $null
            modelWersja          = $null
            plytaProducent       = $null
            plytaModel           = $null
            numerSeryjnyBios     = $null
            numerSeryjnyObudowy  = $null
            numerSeryjnyProduktu = $null
            typyObudowy          = @()
            typSystemuPc         = $null
            cpu                  = $null
            ramBajty             = $null
            pamiec               = @()
            dyski                = @()
            system               = $null
            karty                = @()
            bios                 = $null
            entraId              = $null
            bitlocker            = $null
            bledy                = @()
        }
        $bledy = New-Object System.Collections.Generic.List[string]

        try {
            $cs = Get-CimInstance -ClassName Win32_ComputerSystem
            $dane.producent = $cs.Manufacturer
            $dane.model = $cs.Model
            $dane.typSystemuPc = [int]$cs.PCSystemType
            $dane.ramBajty = [double]$cs.TotalPhysicalMemory
            $dane.zalogowanyUzytkownik = $cs.UserName
        } catch { $bledy.Add(('Win32_ComputerSystem: {0}' -f $_.Exception.Message)) }

        try {
            $produkt = Get-CimInstance -ClassName Win32_ComputerSystemProduct
            $dane.modelWersja = $produkt.Version
            $dane.numerSeryjnyProduktu = $produkt.IdentifyingNumber
        } catch { $bledy.Add(('Win32_ComputerSystemProduct: {0}' -f $_.Exception.Message)) }

        try {
            $plyta = Get-CimInstance -ClassName Win32_BaseBoard | Select-Object -First 1
            $dane.plytaProducent = $plyta.Manufacturer
            $dane.plytaModel = $plyta.Product
        } catch { $bledy.Add(('Win32_BaseBoard: {0}' -f $_.Exception.Message)) }

        try {
            $bios = Get-CimInstance -ClassName Win32_BIOS
            $dane.numerSeryjnyBios = $bios.SerialNumber
            $dataBios = $null
            if ($bios.ReleaseDate) { $dataBios = $bios.ReleaseDate.ToString('yyyy-MM-dd') }
            $dane.bios = [pscustomobject]@{ wersja = $bios.SMBIOSBIOSVersion; data = $dataBios }
        } catch { $bledy.Add(('Win32_BIOS: {0}' -f $_.Exception.Message)) }

        try {
            $obudowa = Get-CimInstance -ClassName Win32_SystemEnclosure | Select-Object -First 1
            $dane.numerSeryjnyObudowy = $obudowa.SerialNumber
            $dane.typyObudowy = @($obudowa.ChassisTypes | Where-Object { $null -ne $_ } | ForEach-Object { [int]$_ })
        } catch { $bledy.Add(('Win32_SystemEnclosure: {0}' -f $_.Exception.Message)) }

        try {
            $dane.cpu = (Get-CimInstance -ClassName Win32_Processor | Select-Object -First 1).Name
        } catch { $bledy.Add(('Win32_Processor: {0}' -f $_.Exception.Message)) }

        try {
            $dane.pamiec = @(Get-CimInstance -ClassName Win32_PhysicalMemory | ForEach-Object {
                [pscustomobject]@{ pojemnosc = [double]$_.Capacity; typSmbios = [int]$_.SMBIOSMemoryType; predkosc = [int]$_.Speed }
            })
        } catch { $bledy.Add(('Win32_PhysicalMemory: {0}' -f $_.Exception.Message)) }

        try {
            # MSFT_PhysicalDisk rozróżnia SSD/HDD (MediaType) i magistralę (BusType: USB, NVMe…).
            $dane.dyski = @(Get-CimInstance -Namespace 'root\Microsoft\Windows\Storage' -ClassName MSFT_PhysicalDisk | ForEach-Object {
                [pscustomobject]@{ nazwa = $_.FriendlyName; rozmiar = [double]$_.Size; typNosnika = [int]$_.MediaType; magistrala = [int]$_.BusType }
            })
        } catch {
            $bledy.Add(('MSFT_PhysicalDisk: {0}' -f $_.Exception.Message))
            try {
                # Zapas: Win32_DiskDrive nie odróżnia SSD od HDD, ale poda rozmiar i dyski USB.
                $dane.dyski = @(Get-CimInstance -ClassName Win32_DiskDrive | ForEach-Object {
                    $magistrala = 0
                    if ($_.InterfaceType -eq 'USB') { $magistrala = 7 }
                    [pscustomobject]@{ nazwa = $_.Model; rozmiar = [double]$_.Size; typNosnika = 0; magistrala = $magistrala }
                })
            } catch { $bledy.Add(('Win32_DiskDrive: {0}' -f $_.Exception.Message)) }
        }

        try {
            $os = Get-CimInstance -ClassName Win32_OperatingSystem
            # EditionID (Core = Home, Professional = Pro) nie zależy od języka Windowsa, w przeciwieństwie do nazwy.
            $rejestr = Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
            $dane.system = [pscustomobject]@{
                nazwa       = $os.Caption
                edycja      = $rejestr.EditionID
                wersja      = $rejestr.DisplayVersion
                releaseId   = $rejestr.ReleaseId
                kompilacja  = $os.BuildNumber
                typProduktu = [int]$os.ProductType
            }
        } catch { $bledy.Add(('System: {0}' -f $_.Exception.Message)) }

        try {
            $dane.karty = @(Get-NetAdapter -Physical -ErrorAction Stop | ForEach-Object {
                $rodzaj = 'INNA'
                if ($_.PhysicalMediaType -match '802\.11' -or $_.NdisPhysicalMedium -eq 9) { $rodzaj = 'WIFI' }
                elseif ($_.PhysicalMediaType -eq '802.3' -or $_.NdisPhysicalMedium -eq 14) { $rodzaj = 'ETHERNET' }
                [pscustomobject]@{
                    nazwa  = $_.Name
                    opis   = $_.InterfaceDescription
                    mac    = $_.MacAddress
                    rodzaj = $rodzaj
                    usb    = ([string]$_.PnPDeviceID -like 'USB\*')
                }
            })
        } catch {
            $bledy.Add(('Get-NetAdapter: {0}' -f $_.Exception.Message))
            try {
                $dane.karty = @(Get-CimInstance -ClassName Win32_NetworkAdapter -Filter 'PhysicalAdapter = TRUE' | Where-Object { $_.MACAddress } | ForEach-Object {
                    $rodzaj = 'INNA'
                    if ($_.AdapterTypeID -eq 9 -or $_.Name -match 'Wi-?Fi|Wireless|802\.11') { $rodzaj = 'WIFI' }
                    elseif ($_.AdapterTypeID -eq 0) { $rodzaj = 'ETHERNET' }
                    [pscustomobject]@{ nazwa = $_.NetConnectionID; opis = $_.Name; mac = $_.MACAddress; rodzaj = $rodzaj; usb = ([string]$_.PNPDeviceID -like 'USB\*') }
                })
            } catch { $bledy.Add(('Win32_NetworkAdapter: {0}' -f $_.Exception.Message)) }
        }

        try {
            $statusUrzadzenia = (& dsregcmd.exe /status) | Out-String
            if ($statusUrzadzenia -match 'AzureAdJoined\s*:\s*YES') { $dane.entraId = 'DOLACZONY' }
            elseif ($statusUrzadzenia -match 'WorkplaceJoined\s*:\s*YES') { $dane.entraId = 'KONTO_SLUZBOWE' }
            elseif ($statusUrzadzenia -match 'AzureAdJoined') { $dane.entraId = 'BRAK' }
        } catch { $bledy.Add(('dsregcmd: {0}' -f $_.Exception.Message)) }

        # BitLocker: Get-BitLockerVolume działa tylko jako administrator; bez uprawnień
        # zostaje właściwość powłoki Windows (1 = włączony, 2 = wyłączony, 3 = szyfrowanie…).
        try {
            $wolumen = Get-BitLockerVolume -MountPoint $env:SystemDrive -ErrorAction Stop
            if ([string]$wolumen.ProtectionStatus -eq 'On') { $dane.bitlocker = 'WLACZONY' }
            elseif ([string]$wolumen.VolumeStatus -eq 'EncryptionInProgress') { $dane.bitlocker = 'SZYFROWANIE' }
            elseif ([string]$wolumen.VolumeStatus -eq 'FullyEncrypted') { $dane.bitlocker = 'WSTRZYMANY' }
            else { $dane.bitlocker = 'WYLACZONY' }
        } catch {
            try {
                $powloka = New-Object -ComObject Shell.Application
                $ochrona = $powloka.NameSpace($env:SystemDrive + '\').Self.ExtendedProperty('System.Volume.BitLockerProtection')
                switch ([int]$ochrona) {
                    1 { $dane.bitlocker = 'WLACZONY' }
                    2 { $dane.bitlocker = 'WYLACZONY' }
                    3 { $dane.bitlocker = 'SZYFROWANIE' }
                    5 { $dane.bitlocker = 'WSTRZYMANY' }
                    6 { $dane.bitlocker = 'WLACZONY' }
                }
            } catch { $bledy.Add(('BitLocker: {0}' -f $_.Exception.Message)) }
        }

        $dane.bledy = @($bledy)
        return $dane
    }

    # Wysyła odczyt do aplikacji. Gdy serwer jest nieosiągalny (np. laptop poza siecią
    # firmy), zapisuje dane w pliku JSON na pulpicie — admin wgra go w aplikacji.
    # -BezPliku: odczyt cykliczny (konto SYSTEM) — bez pliku, spróbuje za tydzień.
    function Send-DaneSprzetu {
        param([string]$Adres, $Dane, [switch]$BezPliku)
        $json = $Dane | ConvertTo-Json -Depth 6 -Compress
        # Treść jako bajty UTF-8: PowerShell 5.1 kodowałby tekst jako ISO-8859-1 i psuł polskie znaki.
        $bajty = [System.Text.Encoding]::UTF8.GetBytes($json)
        try {
            $odpowiedz = Invoke-RestMethod -Method Post -Uri $Adres -Body $bajty -ContentType 'application/json; charset=utf-8' -UseBasicParsing
            return [string]$odpowiedz.komunikat
        } catch {
            $blad = $_
            $przyczyna = $blad.Exception.Message
            if ($blad.ErrorDetails -and $blad.ErrorDetails.Message) {
                $przyczyna = $blad.ErrorDetails.Message
                try { $przyczyna = [string]($blad.ErrorDetails.Message | ConvertFrom-Json).error } catch { }
            }
            if ($BezPliku) { throw ('Nie udało się wysłać danych do ewidencji ({0}).' -f $przyczyna) }
            $plik = Join-Path ([Environment]::GetFolderPath('Desktop')) ('odczyt-{0}.json' -f $env:COMPUTERNAME)
            [System.IO.File]::WriteAllText($plik, $json, (New-Object System.Text.UTF8Encoding($false)))
            throw ('Nie udało się wysłać danych do ewidencji ({0}). Zapisano je w pliku {1} — wgraj go w aplikacji: Odczyt sprzętu > Wgraj plik.' -f $przyczyna, $plik)
        }
    }

    # Odczyt cykliczny: skrypt z tokenem komputera w katalogu dostępnym tylko dla SYSTEM
    # i Administratorów + zadanie w Harmonogramie zadań (co tydzień, na koncie SYSTEM, więc
    # odczyta też BitLockera). Wymaga uprawnień administratora. Zwraca ścieżkę skryptu.
    function Install-AgentOdczytu {
        param([string]$AdresSerwera, [string]$Token)
        $katalog = Join-Path $env:ProgramData 'EwidencjaSprzetu'
        New-Item -ItemType Directory -Path $katalog -Force | Out-Null
        # Token pozwala wysyłać odczyty tego komputera — zwykły użytkownik nie może go przeczytać.
        # Konta po SID-ach, bo nazwy (np. „Administratorzy”) zależą od języka Windowsa.
        & icacls.exe $katalog /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' | Out-Null
        if ($LASTEXITCODE -ne 0) { throw ('Nie udało się ustawić uprawnień katalogu (icacls: {0})' -f $LASTEXITCODE) }
        $skrypt = Join-Path $katalog 'odczyt.ps1'
        Invoke-WebRequest -Uri ('{0}/odczyt/agent/{1}/skrypt' -f $AdresSerwera, $Token) -OutFile $skrypt -UseBasicParsing
        $akcja = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $skrypt)
        # Losowe opóźnienie rozkłada odczyty wielu komputerów w czasie.
        $wyzwalacz = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At '10:00' -RandomDelay (New-TimeSpan -Hours 3)
        $konto = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
        # Komputer wyłączony o tej porze? StartWhenAvailable nadrobi odczyt przy najbliższej okazji.
        $ustawienia = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
        Register-ScheduledTask -TaskName 'EwidencjaSprzetu-Odczyt' -Description 'Co tydzień wysyła dane sprzętu tego komputera do aplikacji Ewidencja sprzętu IT.' -Action $akcja -Trigger $wyzwalacz -Principal $konto -Settings $ustawienia -Force | Out-Null
        return $skrypt
    }
