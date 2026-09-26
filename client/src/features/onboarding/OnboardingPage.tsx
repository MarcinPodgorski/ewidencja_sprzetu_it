import { PageHeader } from '../../components/PageHeader';
import { KatalogOprogramowaniaCard } from './KatalogOprogramowaniaCard';
import { useOnboardingSesje } from './onboarding.hooks';
import { OnboardingSesjeTable } from './OnboardingSesjeTable';
import { ProfileOprogramowaniaCard } from './ProfileOprogramowaniaCard';
import { UstawieniaKomunikatuCard } from './UstawieniaKomunikatuCard';

/** Administracja > Onboarding: konfiguracja generatora skryptów. Sam skrypt generuje się
 *  z karty konkretnego komputera (przycisk „Przygotuj skrypt onboardingu”). */
export function OnboardingPage() {
  const { data: sesje, isLoading } = useOnboardingSesje();

  return (
    <div>
      <PageHeader title="Onboarding komputerów" subtitle="Katalog programów, profile i komunikat dla skryptów PowerShell" />

      <div className="mb-6 rounded-md bg-indigo-50 px-4 py-3 text-sm text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-200">
        Skrypt dla konkretnego laptopa przygotujesz na jego karcie: <strong>Komputery → wybrany komputer → Przygotuj skrypt onboardingu</strong>.
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <KatalogOprogramowaniaCard />
        </div>
        <div className="space-y-6">
          <ProfileOprogramowaniaCard />
          <UstawieniaKomunikatuCard />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Ostatnio wygenerowane skrypty</h2>
        <OnboardingSesjeTable sesje={sesje} isLoading={isLoading} pokazKomputer />
      </div>
    </div>
  );
}
