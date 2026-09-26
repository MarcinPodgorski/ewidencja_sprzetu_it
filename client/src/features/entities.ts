import { createEntityHooks } from '../lib/entityHooks';
import type {
  AppUser,
  Computer,
  Department,
  Employee,
  Keyboard,
  Monitor,
  Mouse,
  Oprogramowanie,
  ProfilOprogramowania,
  Phone,
  Printer,
  SimCard,
  Toner,
} from '../types/entities';

export const departmentsApi = createEntityHooks<Department>('/departments', 'departments');
export const employeesApi = createEntityHooks<Employee>('/employees', 'employees');
export const appUsersApi = createEntityHooks<AppUser>('/app-users', 'app-users');

export const computersApi = createEntityHooks<Computer>('/computers', 'computers');
export const monitorsApi = createEntityHooks<Monitor>('/monitors', 'monitors');
export const miceApi = createEntityHooks<Mouse>('/mice', 'mice');
export const keyboardsApi = createEntityHooks<Keyboard>('/keyboards', 'keyboards');
export const phonesApi = createEntityHooks<Phone>('/phones', 'phones');
export const simCardsApi = createEntityHooks<SimCard>('/sim-cards', 'sim-cards');
export const printersApi = createEntityHooks<Printer>('/printers', 'printers');
export const tonersApi = createEntityHooks<Toner>('/toners', 'toners');

export const oprogramowanieApi = createEntityHooks<Oprogramowanie>('/oprogramowanie', 'oprogramowanie');
export const profileOprogramowaniaApi = createEntityHooks<ProfilOprogramowania>(
  '/profile-oprogramowania',
  'profile-oprogramowania',
);
