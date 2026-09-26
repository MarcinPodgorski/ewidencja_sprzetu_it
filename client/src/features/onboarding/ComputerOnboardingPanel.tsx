import { useNavigate } from 'react-router-dom';
import type { Computer } from '../../types/entities';
import { useOnboardingSesje } from './onboarding.hooks';
import { OnboardingSesjeTable } from './OnboardingSesjeTable';

/** Sekcja „Onboarding” na karcie komputera (DetailExtra w computers.config). */
export function ComputerOnboardingPanel({ item }: { item: Computer }) {
  const navigate = useNavigate();
  const { data: sesje, isLoading } = useOnboardingSesje(item.id);

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Onboarding</h2>
        {!item.wycofany && (
          <button type="button" className="btn-secondary" onClick={() => navigate(`/computers/${item.id}/onboarding`)}>
            Przygotuj skrypt onboardingu
          </button>
        )}
      </div>
      {!isLoading && sesje?.length === 0 ? (
        <div className="card text-sm text-gray-500 dark:text-gray-400">
          Skrypt PowerShell do pierwszej konfiguracji laptopa: komunikat przy logowaniu, programy, konto pracownika, nazwa
          komputera i Microsoft 365.
        </div>
      ) : (
        <OnboardingSesjeTable sesje={sesje} isLoading={isLoading} />
      )}
    </div>
  );
}
