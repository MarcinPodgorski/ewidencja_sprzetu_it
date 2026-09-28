// Uwaga: celowo jawne re-eksporty (zamiast `export * from`). Tsc kompiluje
// `export *` do CommonJS przez runtime'owy helper `__exportStar`, którego Rollup
// (build produkcyjny Vite) nie potrafi statycznie przeanalizować — traktuje wtedy
// pakiet `shared` jako pozbawiony nazwanych eksportów. Jawne `export { x } from`
// kompilują się do wzorca `Object.defineProperty(exports, 'x', ...)`, który zarówno
// Rollup, jak i Node CJS-interop rozpoznają bezproblemowo.

export {
  COMPUTER_TYPES,
  RAM_TYPES,
  PHONE_TYPES,
  APP_USER_ROLES,
  PERMISSION_LEVELS,
  EQUIPMENT_TYPES,
  EQUIPMENT_TYPE_LABELS,
  COMPUTER_TYPE_LABELS,
  PHONE_TYPE_LABELS,
  HISTORY_ENABLED_TYPES,
  EQUIPMENT_API_SEGMENT,
  ONBOARDING_TRYBY,
  ONBOARDING_TRYB_LABELS,
  OPROGRAMOWANIE_ZRODLA,
  OPROGRAMOWANIE_ZRODLO_LABELS,
  INSTALATOR_ROZSZERZENIA,
  SYSTEMY_OPERACYJNE,
  SYSTEM_OPERACYJNY_LABELS,
  rodzinaSystemu,
  edycjaWindowsa,
} from './enums';
export type {
  ComputerType,
  RamType,
  PhoneType,
  AppUserRole,
  PermissionLevel,
  EquipmentType,
  OnboardingTryb,
  OprogramowanieZrodlo,
  SystemOperacyjny,
  RodzinaSystemu,
} from './enums';

export {
  idParamSchema,
  macAddressSchema,
  requiredString,
  optionalString,
  emptyToNull,
  emptyToUndefined,
  numerEwidencyjnySchema,
  numerSeryjnySchema,
  markaModelSchema,
  optionalDateSchema,
  kosztBruttoGroszeSchema,
} from './schemas/common';
export type { IdParam } from './schemas/common';

export { loginSchema, changePasswordSchema, resetPasswordSchema } from './schemas/auth';
export type { LoginInput, ChangePasswordInput, ResetPasswordInput } from './schemas/auth';

export { departmentCreateSchema, departmentUpdateSchema } from './schemas/department';
export type { DepartmentCreateInput, DepartmentUpdateInput } from './schemas/department';

export { employeeCreateSchema, employeeUpdateSchema } from './schemas/employee';
export type { EmployeeCreateInput, EmployeeUpdateInput } from './schemas/employee';

export { appUserCreateSchema, appUserUpdateSchema } from './schemas/appUser';
export type { AppUserCreateInput, AppUserUpdateInput } from './schemas/appUser';

export { computerCreateSchema, computerUpdateSchema } from './schemas/computer';
export type { ComputerCreateInput, ComputerUpdateInput } from './schemas/computer';

export { monitorCreateSchema, monitorUpdateSchema } from './schemas/monitor';
export type { MonitorCreateInput, MonitorUpdateInput } from './schemas/monitor';

export { mouseCreateSchema, mouseUpdateSchema, pairKeyboardSchema } from './schemas/mouse';
export type { MouseCreateInput, MouseUpdateInput, PairKeyboardInput } from './schemas/mouse';

export { keyboardCreateSchema, keyboardUpdateSchema, pairMouseSchema } from './schemas/keyboard';
export type { KeyboardCreateInput, KeyboardUpdateInput, PairMouseInput } from './schemas/keyboard';

export { phoneCreateSchema, phoneUpdateSchema } from './schemas/phone';
export type { PhoneCreateInput, PhoneUpdateInput } from './schemas/phone';

export { simCardCreateSchema, simCardUpdateSchema } from './schemas/simCard';
export type { SimCardCreateInput, SimCardUpdateInput } from './schemas/simCard';

export { printerCreateSchema, printerUpdateSchema, relocatePrinterSchema, addPrinterTonerSchema } from './schemas/printer';
export type { PrinterCreateInput, PrinterUpdateInput, RelocatePrinterInput, AddPrinterTonerInput } from './schemas/printer';

export { tonerCreateSchema, tonerUpdateSchema } from './schemas/toner';
export type { TonerCreateInput, TonerUpdateInput } from './schemas/toner';

export { assignEquipmentSchema, unassignEquipmentSchema, equipmentRefSchema } from './schemas/assignment';
export type { AssignEquipmentInput, UnassignEquipmentInput, EquipmentRef } from './schemas/assignment';

export {
  equipmentListCreateSchema,
  equipmentListUpdateSchema,
  addEquipmentListItemSchema,
  grantEquipmentListPermissionSchema,
  updateEquipmentListPermissionSchema,
} from './schemas/equipmentList';
export type {
  EquipmentListCreateInput,
  EquipmentListUpdateInput,
  AddEquipmentListItemInput,
  GrantEquipmentListPermissionInput,
  UpdateEquipmentListPermissionInput,
} from './schemas/equipmentList';

export { generateProtocolSchema } from './schemas/protocol';
export type { GenerateProtocolInput } from './schemas/protocol';

export { miscItemCreateSchema } from './schemas/miscItem';
export type { MiscItemCreateInput } from './schemas/miscItem';

export { fakturaCreateSchema, fakturaUpdateSchema } from './schemas/faktura';
export type { FakturaCreateInput, FakturaUpdateInput } from './schemas/faktura';

export {
  WINGET_ID_REGEX,
  NAZWA_KOMPUTERA_REGEX,
  LOGIN_LOKALNY_REGEX,
  oprogramowanieCreateSchema,
  oprogramowanieUpdateSchema,
  profilOprogramowaniaCreateSchema,
  profilOprogramowaniaUpdateSchema,
  ustawieniaOnboardinguSchema,
  onboardingSesjaCreateSchema,
} from './schemas/onboarding';
export type {
  OprogramowanieCreateInput,
  OprogramowanieUpdateInput,
  ProfilOprogramowaniaCreateInput,
  ProfilOprogramowaniaUpdateInput,
  UstawieniaOnboardinguInput,
  OnboardingSesjaCreateInput,
} from './schemas/onboarding';
