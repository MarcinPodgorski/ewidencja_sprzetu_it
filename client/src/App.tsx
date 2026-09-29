import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';

import { EquipmentListPage } from './features/equipment/EquipmentListPage';
import { EquipmentDetailPage } from './features/equipment/EquipmentDetailPage';
import { EquipmentFormPage } from './features/equipment/EquipmentFormPage';
import { computerConfig } from './features/equipment/computers.config';
import { monitorConfig } from './features/equipment/monitors.config';
import { mouseConfig } from './features/equipment/mice.config';
import { keyboardConfig } from './features/equipment/keyboards.config';
import { phoneConfig } from './features/equipment/phones.config';
import { simCardConfig } from './features/equipment/simCards.config';

import { PrintersListPage } from './features/printers/PrintersListPage';
import { PrinterDetailPage } from './features/printers/PrinterDetailPage';
import { PrinterFormPage } from './features/printers/PrinterFormPage';
import { TonersListPage } from './features/toners/TonersListPage';
import { TonerFormPage } from './features/toners/TonerFormPage';

import { EmployeesListPage } from './features/employees/EmployeesListPage';
import { EmployeeDetailPage } from './features/employees/EmployeeDetailPage';
import { EmployeeFormPage } from './features/employees/EmployeeFormPage';
import { ZwrotSprzetuPage } from './features/employees/ZwrotSprzetuPage';
import { DepartmentsPage } from './features/departments/DepartmentsPage';
import { AppUsersPage } from './features/appUsers/AppUsersPage';
import { EquipmentListsPage } from './features/equipmentLists/EquipmentListsPage';
import { EquipmentListDetailPage } from './features/equipmentLists/EquipmentListDetailPage';
import { ProtocolGeneratorPage } from './features/protocols/ProtocolGeneratorPage';
import { FakturyListPage } from './features/faktury/FakturyListPage';
import { FakturaDetailPage } from './features/faktury/FakturaDetailPage';
import { FakturaFormPage } from './features/faktury/FakturaFormPage';
import { OnboardingPage } from './features/onboarding/OnboardingPage';
import { OnboardingFormPage } from './features/onboarding/OnboardingFormPage';
import { OnboardingSesjaPage } from './features/onboarding/OnboardingSesjaPage';
import { OdczytyPage } from './features/odczyty/OdczytyPage';
import { OdczytPage } from './features/odczyty/OdczytPage';
import { EtykietyPage } from './features/etykiety/EtykietyPage';
import { InwentaryzacjePage } from './features/inwentaryzacje/InwentaryzacjePage';
import { InwentaryzacjaPage } from './features/inwentaryzacje/InwentaryzacjaPage';
import { SkanPage } from './features/inwentaryzacje/SkanPage';
import { KopiePage } from './features/kopie/KopiePage';
import { StanFlotyPage } from './features/stanFloty/StanFlotyPage';
import { ImportPage } from './features/import/ImportPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        {/* Skan naklejki QR telefonem — osobny, mobilny widok bez paska bocznego. */}
        <Route element={<ProtectedRoute roles={['ADMIN']} />}>
          <Route path="/q/:numer" element={<SkanPage />} />
        </Route>

        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/equipment-lists" element={<EquipmentListsPage />} />
          <Route path="/equipment-lists/:id" element={<EquipmentListDetailPage />} />

          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            {/* Komputery */}
            <Route path="/computers" element={<EquipmentListPage config={computerConfig} />} />
            <Route path="/computers/new" element={<EquipmentFormPage config={computerConfig} />} />
            <Route path="/computers/:id" element={<EquipmentDetailPage config={computerConfig} />} />
            <Route path="/computers/:id/edit" element={<EquipmentFormPage config={computerConfig} />} />
            <Route path="/computers/:id/onboarding" element={<OnboardingFormPage />} />

            {/* Monitory */}
            <Route path="/monitors" element={<EquipmentListPage config={monitorConfig} />} />
            <Route path="/monitors/new" element={<EquipmentFormPage config={monitorConfig} />} />
            <Route path="/monitors/:id" element={<EquipmentDetailPage config={monitorConfig} />} />
            <Route path="/monitors/:id/edit" element={<EquipmentFormPage config={monitorConfig} />} />

            {/* Myszy */}
            <Route path="/mice" element={<EquipmentListPage config={mouseConfig} />} />
            <Route path="/mice/new" element={<EquipmentFormPage config={mouseConfig} />} />
            <Route path="/mice/:id" element={<EquipmentDetailPage config={mouseConfig} />} />
            <Route path="/mice/:id/edit" element={<EquipmentFormPage config={mouseConfig} />} />

            {/* Klawiatury */}
            <Route path="/keyboards" element={<EquipmentListPage config={keyboardConfig} />} />
            <Route path="/keyboards/new" element={<EquipmentFormPage config={keyboardConfig} />} />
            <Route path="/keyboards/:id" element={<EquipmentDetailPage config={keyboardConfig} />} />
            <Route path="/keyboards/:id/edit" element={<EquipmentFormPage config={keyboardConfig} />} />

            {/* Telefony */}
            <Route path="/phones" element={<EquipmentListPage config={phoneConfig} />} />
            <Route path="/phones/new" element={<EquipmentFormPage config={phoneConfig} />} />
            <Route path="/phones/:id" element={<EquipmentDetailPage config={phoneConfig} />} />
            <Route path="/phones/:id/edit" element={<EquipmentFormPage config={phoneConfig} />} />

            {/* Karty SIM */}
            <Route path="/sim-cards" element={<EquipmentListPage config={simCardConfig} />} />
            <Route path="/sim-cards/new" element={<EquipmentFormPage config={simCardConfig} />} />
            <Route path="/sim-cards/:id" element={<EquipmentDetailPage config={simCardConfig} />} />
            <Route path="/sim-cards/:id/edit" element={<EquipmentFormPage config={simCardConfig} />} />

            {/* Drukarki (własne strony — relokacja zamiast assign, zarządzanie tonerami) */}
            <Route path="/printers" element={<PrintersListPage />} />
            <Route path="/printers/new" element={<PrinterFormPage />} />
            <Route path="/printers/:id" element={<PrinterDetailPage />} />
            <Route path="/printers/:id/edit" element={<PrinterFormPage />} />

            {/* Tonery/tusze */}
            <Route path="/toners" element={<TonersListPage />} />
            <Route path="/toners/new" element={<TonerFormPage />} />
            <Route path="/toners/:id/edit" element={<TonerFormPage />} />

            {/* Pracownicy */}
            <Route path="/employees" element={<EmployeesListPage />} />
            <Route path="/employees/new" element={<EmployeeFormPage />} />
            <Route path="/employees/:id" element={<EmployeeDetailPage />} />
            <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />
            <Route path="/employees/:id/zwrot" element={<ZwrotSprzetuPage />} />

            {/* Faktury */}
            <Route path="/faktury" element={<FakturyListPage />} />
            <Route path="/faktury/new" element={<FakturaFormPage />} />
            <Route path="/faktury/:id" element={<FakturaDetailPage />} />
            <Route path="/faktury/:id/edit" element={<FakturaFormPage />} />

            {/* Onboarding komputerów (generator skryptów PowerShell) */}
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/onboarding/sesje/:id" element={<OnboardingSesjaPage />} />

            {/* Odczyt danych sprzętu skryptem PowerShell */}
            <Route path="/odczyty" element={<OdczytyPage />} />
            <Route path="/odczyty/:id" element={<OdczytPage />} />

            <Route path="/stan-floty" element={<StanFlotyPage />} />

            {/* Import z Excela/CSV */}
            <Route path="/import" element={<ImportPage />} />

            {/* Naklejki QR i spis z natury */}
            <Route path="/etykiety" element={<EtykietyPage />} />
            <Route path="/inwentaryzacje" element={<InwentaryzacjePage />} />
            <Route path="/inwentaryzacje/:id" element={<InwentaryzacjaPage />} />

            {/* Działy, konta aplikacji, protokół przekazania */}
            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/app-users" element={<AppUsersPage />} />
            <Route path="/kopie" element={<KopiePage />} />
            <Route path="/protocols/new" element={<ProtocolGeneratorPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
