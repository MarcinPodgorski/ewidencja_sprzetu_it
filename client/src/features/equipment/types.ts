import type { ComponentType, ReactNode } from 'react';
import type { ZodTypeAny } from 'zod';
import type { EquipmentType } from 'shared';
import type { Column } from '../../components/DataTable';
import type { createEntityHooks } from '../../lib/entityHooks';

export interface EquipmentFormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea';
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  /** Pole z danymi wrażliwymi — na stronie szczegółów renderowane przez <MaskedField>. */
  sensitive?: boolean;
  /** Niestandardowe formatowanie wartości na stronie szczegółów (np. grosze -> "X,XX zł"). */
  displayFormat?: 'money';
  /** Własny widok wartości na stronie szczegółów (np. logo systemu obok nazwy) — ma
   *  pierwszeństwo przed `displayFormat` i domyślnym formatowaniem. */
  renderDetail?: (value: unknown) => ReactNode;
}

export interface EquipmentLike {
  id: number;
  wycofany: boolean;
  aktualnyUzytkownik?: { id: number; imie: string; nazwisko: string } | null;
}

/** Dodatkowy filtr na liście — renderowany jako <select>, wysyłany jako `?field=value`. */
export interface EquipmentExtraFilter {
  field: string;
  label: string;
  options: { value: string; label: string }[];
}

/**
 * Konfiguracja jednego typu sprzętu spinająca generyczne strony CRUD
 * (EquipmentListPage/DetailPage/FormPage) z konkretnym kształtem danych.
 * Odpowiednik konfiguracji `createEquipmentRouter` po stronie backendu.
 */
export interface EquipmentTypeConfig<T extends EquipmentLike> {
  apiHooks: ReturnType<typeof createEntityHooks<T>>;
  /** Dyskryminator używany w tabelach generycznych (historia, spisy, faktury). */
  sprzetTyp: EquipmentType;
  singular: string;
  plural: string;
  routeBase: string;
  columns: Column<T>[];
  formFields: EquipmentFormFieldConfig[];
  createSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
  defaultValues: Record<string, unknown>;
  identifier: (item: T) => string;
  /** Dodatkowa sekcja na stronie szczegółów (np. parowanie mysz/klawiatura) — pełnoprawny
   *  komponent (nie zwykła funkcja), żeby mógł bezpiecznie używać własnych hooków. */
  DetailExtra?: ComponentType<{ item: T }>;
  /** Dodatkowe filtry na liście, specyficzne dla danego typu sprzętu (np. typ, rodzaj RAM). */
  extraFilters?: EquipmentExtraFilter[];
}
