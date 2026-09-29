import {
  Building2,
  CardSim,
  ClipboardCheck,
  ClipboardList,
  Cpu,
  DatabaseBackup,
  Droplets,
  FileSignature,
  FileSpreadsheet,
  KeyRound,
  Keyboard,
  Laptop,
  LayoutDashboard,
  Monitor,
  Mouse,
  Printer,
  QrCode,
  Receipt,
  Rocket,
  ShieldCheck,
  Smartphone,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { AppUserRole } from 'shared';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Dodatkowe słowa, po których wyszukiwarka (Ctrl+K) znajdzie tę stronę. */
  slowa?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Ogólne',
    items: [
      { to: '/', label: 'Pulpit', icon: LayoutDashboard, slowa: 'strona główna start' },
      { to: '/stan-floty', label: 'Stan floty', icon: ShieldCheck, adminOnly: true, slowa: 'bitlocker windows 10 entra gwarancje wymiana' },
      { to: '/equipment-lists', label: 'Spisy sprzętu', icon: ClipboardList, slowa: 'listy' },
    ],
  },
  {
    title: 'Sprzęt',
    items: [
      { to: '/computers', label: 'Komputery', icon: Laptop, adminOnly: true, slowa: 'laptopy stacjonarne serwery pc' },
      { to: '/monitors', label: 'Monitory', icon: Monitor, adminOnly: true, slowa: 'ekrany' },
      { to: '/mice', label: 'Myszy', icon: Mouse, adminOnly: true },
      { to: '/keyboards', label: 'Klawiatury', icon: Keyboard, adminOnly: true },
      { to: '/phones', label: 'Telefony', icon: Smartphone, adminOnly: true, slowa: 'komórki smartfony kolektory' },
      { to: '/sim-cards', label: 'Karty SIM', icon: CardSim, adminOnly: true, slowa: 'numery telefonów pin puk' },
      { to: '/printers', label: 'Drukarki', icon: Printer, adminOnly: true },
      { to: '/toners', label: 'Tonery/tusze', icon: Droplets, adminOnly: true, slowa: 'materiały eksploatacyjne' },
    ],
  },
  {
    title: 'Administracja',
    items: [
      { to: '/employees', label: 'Pracownicy', icon: Users, adminOnly: true, slowa: 'osoby użytkownicy' },
      { to: '/faktury', label: 'Faktury', icon: Receipt, adminOnly: true, slowa: 'zakupy ksef' },
      { to: '/departments', label: 'Działy', icon: Building2, adminOnly: true },
      { to: '/app-users', label: 'Konta aplikacji', icon: KeyRound, adminOnly: true, slowa: 'loginy hasła uprawnienia' },
      { to: '/kopie', label: 'Kopie zapasowe', icon: DatabaseBackup, adminOnly: true, slowa: 'backup' },
    ],
  },
  {
    title: 'Narzędzia',
    items: [
      { to: '/onboarding', label: 'Onboarding', icon: Rocket, adminOnly: true, slowa: 'nowy laptop konfiguracja skrypt' },
      { to: '/odczyty', label: 'Odczyt sprzętu', icon: Cpu, adminOnly: true, slowa: 'skrypt agent powershell cykliczny' },
      { to: '/inwentaryzacje', label: 'Inwentaryzacja', icon: ClipboardCheck, adminOnly: true, slowa: 'spis z natury' },
      { to: '/etykiety', label: 'Etykiety QR', icon: QrCode, adminOnly: true, slowa: 'naklejki kody' },
      { to: '/protocols/new', label: 'Protokół przekazania', icon: FileSignature, adminOnly: true, slowa: 'pdf' },
      { to: '/import', label: 'Import z Excela', icon: FileSpreadsheet, adminOnly: true, slowa: 'csv arkusz wczytaj' },
    ],
  },
];

/** Grupy menu widoczne dla danej roli (puste grupy pominięte). */
export function grupyDlaRoli(rola: AppUserRole | undefined): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.adminOnly || rola === 'ADMIN'),
  })).filter((group) => group.items.length > 0);
}
