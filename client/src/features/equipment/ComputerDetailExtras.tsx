import type { Computer } from '../../types/entities';
import { ComputerOdczytPanel } from '../odczyty/ComputerOdczytPanel';
import { ComputerOnboardingPanel } from '../onboarding/ComputerOnboardingPanel';

/** Dodatkowe sekcje karty komputera: skrypty onboardingu i odczyty danych sprzętu. */
export function ComputerDetailExtras({ item }: { item: Computer }) {
  return (
    <>
      <ComputerOnboardingPanel item={item} />
      <ComputerOdczytPanel item={item} />
    </>
  );
}
