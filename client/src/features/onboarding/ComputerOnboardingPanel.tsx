import { useNavigate } from 'react-router-dom';
import { rodzinaSystemu } from 'shared';
import type { Computer } from '../../types/entities';
import { useOnboardingSesje } from './onboarding.hooks';
import { OnboardingSesjeTable } from './OnboardingSesjeTable';

/** Sekcja „Onboarding” na karcie komputera (DetailExtra w computers.config). */
export function ComputerOnboardingPanel({ item }: { item: Computer }) {
  const navigate = useNavigate();
  const { data: sesje, isLoading } = useOnboardingSesje(item.id);

  // Skrypt jest dla Windowsa — przy Macu/Linuksie/ChromeOS sekcję pokazujemy tylko wtedy,
  // gdy komputer ma już historię sesji (np. system zmieniono w ewidencji później).
  const innySystem =
    item.systemOperacyjny !== null && !['WINDOWS', 'INNY'].includes(rodzinaSystemu(item.systemOperacyjny));
  if (innySystem && !sesje?.length) return null;

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Onboarding</h2>
        {!item.wycofany && !innySystem && (
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
