/**
 * Dane demo do lokalnego developmentu: konto admina, kilka działów, pracowników,
 * po parę sztuk każdego typu sprzętu (z przypisaniami i historią), jeden przykładowy
 * spis z pozycjami i uprawnieniem dla konta testowego "user".
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Seed czyści CAŁĄ bazę i wstawia dane demo z hasłem admin123 — w produkcji to katastrofa.
  // Pierwsze konto admina na pustej bazie serwer zakłada sam (modules/appUsers/pierwszyAdmin.ts).
  if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO_W_PRODUKCJI !== 'tak') {
    console.error(
      'Odmowa: seed kasuje całą bazę i wstawia dane demo, a to jest produkcja (NODE_ENV=production).\n' +
        'Konto administratora na pustej bazie serwer tworzy sam przy starcie — patrz README.\n' +
        'Jeśli naprawdę chcesz dane demo: SEED_DEMO_W_PRODUKCJI=tak.',
    );
    process.exit(1);
  }

  console.log('Czyszczenie istniejących danych...');
  await prisma.inwentaryzacja.deleteMany(); // pozycje kasowane kaskadowo
  await prisma.zmianaDanych.deleteMany();
  await prisma.odczytSprzetu.deleteMany();
  await prisma.odczytAgent.deleteMany();
  await prisma.odczytKod.deleteMany();
  await prisma.onboardingSesja.deleteMany();
  await prisma.profilOprogramowania.deleteMany(); // pozycje profili kasowane kaskadowo
  await prisma.oprogramowanie.deleteMany();
  await prisma.ustawieniaOnboardingu.deleteMany(); // domyślne wartości odtworzą się przy pierwszym odczycie
  await prisma.ustawieniaStanuFloty.deleteMany(); // brak wiersza = żadna sekcja nie jest ukryta
  await prisma.equipmentListPermission.deleteMany();
  await prisma.equipmentListItem.deleteMany();
  await prisma.equipmentList.deleteMany();
  await prisma.assignmentHistory.deleteMany();
  await prisma.zwrotSprzetu.deleteMany();
  await prisma.miscItem.deleteMany();
  await prisma.faktura.deleteMany(); // faktura_pozycje kasowane kaskadowo
  await prisma.printerToner.deleteMany();
  await prisma.toner.deleteMany();
  await prisma.printer.deleteMany();
  await prisma.peripheralPair.deleteMany();
  await prisma.simCard.deleteMany();
  await prisma.phone.deleteMany();
  await prisma.keyboard.deleteMany();
  await prisma.mouse.deleteMany();
  await prisma.monitor.deleteMany();
  await prisma.computer.deleteMany();
  await prisma.appUser.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();

  // Wgrane pliki (załączniki faktur, instalatory) — po wyczyszczeniu bazy nic już na
  // nie nie wskazuje, więc bez tego zostawałyby na dysku jako sieroty.
  for (const katalog of ['faktury', 'instalatory']) {
    const sciezka = path.resolve(__dirname, '../uploads', katalog);
    if (!fs.existsSync(sciezka)) continue;
    for (const plik of fs.readdirSync(sciezka)) fs.rmSync(path.join(sciezka, plik), { force: true });
  }

  console.log('Tworzenie działów...');
  const [dzialIT, dzialKsiegowosc, dzialMagazyn] = await Promise.all([
    prisma.department.create({ data: { nazwa: 'IT' } }),
    prisma.department.create({ data: { nazwa: 'Księgowość' } }),
    prisma.department.create({ data: { nazwa: 'Magazyn' } }),
  ]);

  console.log('Tworzenie kont aplikacji...');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const userPasswordHash = await bcrypt.hash('user123', 10);

  const admin = await prisma.appUser.create({
    data: {
      imie: 'Adam',
      nazwisko: 'Administrator',
      login: 'admin',
      hasloHash: adminPasswordHash,
      rola: 'ADMIN',
    },
  });

  const testUser = await prisma.appUser.create({
    data: {
      imie: 'Anna',
      nazwisko: 'Kowalska',
      login: 'akowalska',
      hasloHash: userPasswordHash,
      rola: 'USER',
    },
  });

  console.log('Tworzenie pracowników...');
  const jNowak = await prisma.employee.create({
    data: { imie: 'Jan', nazwisko: 'Nowak', stanowisko: 'Specjalista IT', email: 'jan.nowak@example.com', dzialId: dzialIT.id },
  });
  const kZielinska = await prisma.employee.create({
    data: {
      imie: 'Katarzyna',
      nazwisko: 'Zielińska',
      stanowisko: 'Główna księgowa',
      email: 'katarzyna.zielinska@example.com',
      dzialId: dzialKsiegowosc.id,
    },
  });
  const pWisniewski = await prisma.employee.create({
    data: {
      imie: 'Piotr',
      nazwisko: 'Wiśniewski',
      stanowisko: 'Magazynier',
      dzialId: dzialMagazyn.id,
    },
  });

  /** Pomocnik: tworzy wpis historii i ustawia bieżącego użytkownika sprzętu. */
  async function assign(sprzetTyp: string, sprzetId: number, employeeId: number) {
    await prisma.assignmentHistory.create({
      data: {
        sprzetTyp,
        sprzetId,
        uzytkownikId: employeeId,
        dataOd: new Date(),
        utworzylAppUserId: admin.id,
      },
    });
  }

  console.log('Tworzenie komputerów...');
  const komputer1 = await prisma.computer.create({
    data: {
      numerEwidencyjny: 'KOMP-001',
      numerSeryjny: 'SN-CMP-0001',
      typ: 'LAPTOP',
      cpu: 'Intel Core i7-1355U',
      ramIloscGb: 16,
      ramRodzaj: 'DDR5',
      markaModel: 'Dell Latitude 5440',
      pojemnoscDysku: '512GB SSD',
      systemOperacyjny: 'WINDOWS_11_PRO',
      wersjaSystemu: '24H2',
      macEthernet: '00:1A:2B:3C:4D:5E',
      macWifi: '00:1A:2B:3C:4D:5F',
      notatki: 'Laptop służbowy, gwarancja do 2027',
      dataZakupu: new Date('2024-03-15'),
      dataKoncaGwarancji: new Date('2027-03-15'),
      kosztBruttoGrosze: 599900,
      aktualnyUzytkownikId: jNowak.id,
    },
  });
  await assign('KOMPUTER', komputer1.id, jNowak.id);

  const komputer2 = await prisma.computer.create({
    data: {
      numerEwidencyjny: 'KOMP-002',
      numerSeryjny: 'SN-CMP-0002',
      typ: 'STACJONARNY',
      cpu: 'AMD Ryzen 5 5600',
      ramIloscGb: 32,
      ramRodzaj: 'DDR4',
      markaModel: 'HP ProDesk 400 G7',
      pojemnoscDysku: '1TB SSD',
      systemOperacyjny: 'WINDOWS_10_PRO',
      wersjaSystemu: '22H2',
      aktualnyUzytkownikId: kZielinska.id,
    },
  });
  await assign('KOMPUTER', komputer2.id, kZielinska.id);

  // Nieprzypisane — pokazują pozostałe ikony systemów na liście komputerów.
  await prisma.computer.create({
    data: {
      numerEwidencyjny: 'KOMP-003',
      numerSeryjny: 'SN-CMP-0003',
      typ: 'LAPTOP',
      cpu: 'Apple M3',
      ramIloscGb: 16,
      ramRodzaj: 'INNY',
      markaModel: 'MacBook Air 13"',
      pojemnoscDysku: '512GB SSD',
      systemOperacyjny: 'MACOS',
      wersjaSystemu: 'Sequoia 15',
    },
  });
  await prisma.computer.create({
    data: {
      numerEwidencyjny: 'KOMP-004',
      numerSeryjny: 'SN-SRV-0001',
      typ: 'SERWER',
      cpu: 'Intel Xeon E-2334',
      ramIloscGb: 32,
      ramRodzaj: 'DDR4',
      markaModel: 'Dell PowerEdge T150',
      pojemnoscDysku: '2x 2TB HDD (RAID 1)',
      systemOperacyjny: 'LINUX',
      wersjaSystemu: 'Ubuntu 24.04 LTS',
      notatki: 'Serwer plików',
    },
  });

  console.log('Tworzenie monitorów...');
  const monitor1 = await prisma.monitor.create({
    data: {
      numerEwidencyjny: 'MON-001',
      numerSeryjny: 'SN-MON-0001',
      markaModel: 'Dell P2422H',
      zlacza: 'HDMI, DisplayPort, VGA',
      proporcjeEkranu: '16:9',
      wielkoscEkranu: 24,
      aktualnyUzytkownikId: jNowak.id,
    },
  });
  await assign('MONITOR', monitor1.id, jNowak.id);

  console.log('Tworzenie zestawu mysz+klawiatura...');
  const mysz1 = await prisma.mouse.create({
    data: {
      numerEwidencyjny: 'MYSZ-001',
      numerSeryjny: 'SN-MOU-0001',
      markaModel: 'Logitech MX Master 3',
      czyZestaw: true,
      aktualnyUzytkownikId: jNowak.id,
    },
  });
  const klawiatura1 = await prisma.keyboard.create({
    data: {
      numerEwidencyjny: 'KLAW-001',
      numerSeryjny: 'SN-KEY-0001',
      markaModel: 'Logitech MX Keys',
      czyZestaw: true,
      aktualnyUzytkownikId: jNowak.id,
    },
  });
  await prisma.peripheralPair.create({
    data: { mouseId: mysz1.id, keyboardId: klawiatura1.id },
  });
  await assign('MYSZ', mysz1.id, jNowak.id);
  await assign('KLAWIATURA', klawiatura1.id, jNowak.id);

  console.log('Tworzenie karty SIM i telefonu...');
  const karta1 = await prisma.simCard.create({
    data: {
      iccid: '8948012345678901234',
      numerTelefonu: '+48 500 100 200',
      pin1: '1111',
      puk1: '12345678',
      taryfa: 'Firmowa M',
      kosztMiesiecznyGrosze: 4900,
      dataKoncaUmowy: new Date('2026-12-31'),
      aktualnyUzytkownikId: pWisniewski.id,
    },
  });
  await assign('KARTA_SIM', karta1.id, pWisniewski.id);

  const telefon1 = await prisma.phone.create({
    data: {
      numerEwidencyjny: 'TEL-001',
      numerSeryjny: 'SN-PHN-0001',
      markaModel: 'Samsung Galaxy XCover 6 Pro',
      typ: 'KOLEKTOR',
      imei: '356938035643809',
      kodOdblokowania: '0000',
      dataZakupu: new Date('2024-06-01'),
      dataKoncaGwarancji: new Date('2026-06-01'),
      kosztBruttoGrosze: 189900,
      simCardId: karta1.id,
      aktualnyUzytkownikId: pWisniewski.id,
    },
  });
  await assign('TELEFON', telefon1.id, pWisniewski.id);

  console.log('Tworzenie drukarki i tonerów...');
  const toner1 = await prisma.toner.create({
    data: { oznaczenie: 'HP 30A (CF230A)', ilosc: 5 },
  });
  const drukarka1 = await prisma.printer.create({
    data: {
      numerEwidencyjny: 'DRUK-001',
      numerSeryjny: 'SN-PRN-0001',
      markaModel: 'HP LaserJet Pro M203',
      dzialPietroMiejsce: 'IT, piętro 1, sala serwerowa',
      adresIP: '10.0.1.50',
      mac: '00:1A:2B:3C:4D:60',
      dataZakupu: new Date('2023-01-10'),
      kosztBruttoGrosze: 129900,
    },
  });
  await prisma.printerToner.create({ data: { printerId: drukarka1.id, tonerId: toner1.id } });
  await prisma.assignmentHistory.create({
    data: {
      sprzetTyp: 'DRUKARKA',
      sprzetId: drukarka1.id,
      lokalizacja: drukarka1.dzialPietroMiejsce,
      dataOd: new Date(),
      utworzylAppUserId: admin.id,
    },
  });

  console.log('Tworzenie faktur...');
  await prisma.faktura.create({
    data: {
      numer: 'FV/2024/03/0123',
      numerKsef: '5213123456-20240315-010000004521-7F',
      kwotaGrosze: 599900,
      pozycje: { create: [{ sprzetTyp: 'KOMPUTER', sprzetId: komputer1.id }] },
    },
  });
  // Jedna faktura obejmująca kilka sztuk sprzętu naraz (partia peryferiów) — przykład
  // relacji M:N, bez numeru KSeF (starsza faktura sprzed wdrożenia KSeF u dostawcy).
  await prisma.faktura.create({
    data: {
      numer: 'FV/2024/02/0089',
      kwotaGrosze: 350000,
      pozycje: {
        create: [
          { sprzetTyp: 'MONITOR', sprzetId: monitor1.id },
          { sprzetTyp: 'MYSZ', sprzetId: mysz1.id },
          { sprzetTyp: 'KLAWIATURA', sprzetId: klawiatura1.id },
        ],
      },
    },
  });
  await prisma.faktura.create({
    data: {
      numer: 'FV/2024/06/0042',
      numerKsef: '5213123456-20240601-010000009981-A3',
      kwotaGrosze: 189900,
      pozycje: { create: [{ sprzetTyp: 'TELEFON', sprzetId: telefon1.id }] },
    },
  });
  await prisma.faktura.create({
    data: {
      numer: 'FV/2023/01/0007',
      kwotaGrosze: 129900,
      pozycje: { create: [{ sprzetTyp: 'DRUKARKA', sprzetId: drukarka1.id }] },
    },
  });

  console.log('Tworzenie katalogu oprogramowania i profili onboardingu...');
  const katalog = [
    { nazwa: 'Google Chrome', wingetId: 'Google.Chrome' },
    { nazwa: '7-Zip', wingetId: '7zip.7zip' },
    { nazwa: 'Adobe Acrobat Reader', wingetId: 'Adobe.Acrobat.Reader.64-bit' },
    { nazwa: 'VLC', wingetId: 'VideoLAN.VLC' },
    { nazwa: 'Microsoft Teams', wingetId: 'Microsoft.Teams' },
    { nazwa: 'AnyDesk', wingetId: 'AnyDesk.AnyDesk', opis: 'Zdalna pomoc IT' },
    { nazwa: 'Notepad++', wingetId: 'Notepad++.Notepad++' },
  ];
  const programy = new Map<string, number>();
  for (const program of katalog) {
    const utworzony = await prisma.oprogramowanie.create({ data: program });
    programy.set(program.wingetId, utworzony.id);
  }
  const pozycje = (...wingetIds: string[]) => ({
    create: wingetIds.map((wingetId) => ({ oprogramowanieId: programy.get(wingetId)! })),
  });
  await prisma.profilOprogramowania.create({
    data: {
      nazwa: 'Standard biurowy',
      opis: 'Przeglądarka, archiwizer, czytnik PDF i Teams',
      dzialId: dzialKsiegowosc.id,
      pozycje: pozycje('Google.Chrome', '7zip.7zip', 'Adobe.Acrobat.Reader.64-bit', 'Microsoft.Teams'),
    },
  });
  await prisma.profilOprogramowania.create({
    data: {
      nazwa: 'Dział IT',
      dzialId: dzialIT.id,
      pozycje: pozycje('Google.Chrome', '7zip.7zip', 'Notepad++.Notepad++', 'AnyDesk.AnyDesk', 'Microsoft.Teams'),
    },
  });

  console.log('Tworzenie przykładowego spisu i uprawnień...');
  const spisIT = await prisma.equipmentList.create({
    data: {
      nazwa: 'Sprzęt działu IT — 2026',
      dzialId: dzialIT.id,
      opis: 'Roczny spis inwentaryzacyjny sprzętu przypisanego do działu IT.',
      utworzylAppUserId: admin.id,
    },
  });
  await prisma.equipmentListItem.createMany({
    data: [
      { listId: spisIT.id, sprzetTyp: 'KOMPUTER', sprzetId: komputer1.id, dodalAppUserId: admin.id },
      { listId: spisIT.id, sprzetTyp: 'MONITOR', sprzetId: monitor1.id, dodalAppUserId: admin.id },
      { listId: spisIT.id, sprzetTyp: 'MYSZ', sprzetId: mysz1.id, dodalAppUserId: admin.id },
      { listId: spisIT.id, sprzetTyp: 'KLAWIATURA', sprzetId: klawiatura1.id, dodalAppUserId: admin.id },
    ],
  });
  await prisma.equipmentListPermission.create({
    data: {
      listId: spisIT.id,
      appUserId: testUser.id,
      poziom: 'VIEW',
      nadalAppUserId: admin.id,
    },
  });

  console.log('Seed zakończony.');
  console.log('  Admin:  login="admin"      hasło="admin123"');
  console.log('  User:   login="akowalska"  hasło="user123" (VIEW na spisie "Sprzęt działu IT — 2026")');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
