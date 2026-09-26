import { Router } from 'express';
import { EQUIPMENT_TYPES, type EquipmentType } from 'shared';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { searchEquipment } from './equipmentLookup';

export const equipmentSearchRouter = Router();

/**
 * Dostępne każdemu zalogowanemu użytkownikowi aplikacji (nie tylko admin) — zwraca
 * tylko pola identyfikacyjne, bez danych wrażliwych. Używane przy ręcznym dodawaniu
 * pozycji do spisu (rola "user" z uprawnieniem EDIT musi móc wyszukać sprzęt, mimo
 * że nie ma dostępu do pełnych stron CRUD poszczególnych typów sprzętu) oraz przy
 * przypisywaniu istniejącego sprzętu do pracownika z jego karty (opcjonalny `?typ=`
 * zawęża wynik do jednej kategorii).
 */
equipmentSearchRouter.get(
  '/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const typParam = typeof req.query.typ === 'string' ? req.query.typ : undefined;
    const types = typParam && (EQUIPMENT_TYPES as readonly string[]).includes(typParam)
      ? [typParam as EquipmentType]
      : undefined;
    const items = await searchEquipment(q, { types });
    res.json({ items });
  }),
);
