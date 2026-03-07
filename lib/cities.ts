/**
 * Villes et zones pour le filtrage plombier/client (style inDrive)
 * Support multi-pays : MA (Maroc) et ES (Espagne)
 */

import type { Country } from '@/types';

export type ZoneCode = 'casa' | 'rabat' | 'tanger' | 'marrakech' | 'agadir' | 'tetouan' | 'fes';

export const ZONE_TO_CITY: Record<ZoneCode, string> = {
  casa: 'Casablanca',
  rabat: 'Rabat',
  tanger: 'Tanger',
  marrakech: 'Marrakech',
  agadir: 'Agadir',
  tetouan: 'Tétouan',
  fes: 'Fès',
};

export const CITIES_MA = [
  'Casablanca',
  'Rabat',
  'Tanger',
  'Marrakech',
  'Agadir',
  'Tétouan',
  'Fès',
  'Meknès',
  'Oujda',
  'Kénitra',
  'Témara',
  'Safi',
  'Mohammedia',
  'El Jadida',
  'Nador',
  'Khouribga',
  'Béni Mellal',
  'Settat',
] as const;

export const CITIES_ES = [
  'Madrid',
  'Barcelona',
  'Valencia',
  'Séville',
  'Zaragoza',
  'Málaga',
  'Murcia',
  'Palma de Mallorca',
  'Las Palmas',
  'Bilbao',
  'Alicante',
  'Córdoba',
  'Valladolid',
  'Vigo',
  'Gijón',
  'Santander',
  'Oviedo',
] as const;

/** @deprecated Utiliser getCities(country) pour le multi-pays */
export const CITIES = CITIES_MA;

export function getCities(country: Country): readonly string[] {
  return country === 'ES' ? CITIES_ES : CITIES_MA;
}

/** Variantes de normalisation par pays */
const CITY_VARIANTS: Record<string, string> = {
  casa: 'casablanca',
  casablanca: 'casablanca',
  'casa blanca': 'casablanca',
  tetouan: 'tétouan',
  tétouan: 'tétouan',
  fes: 'fès',
  fès: 'fès',
  fez: 'fès',
  madrid: 'madrid',
  barcelona: 'barcelona',
  valencia: 'valencia',
  sevilla: 'séville',
  séville: 'séville',
  seville: 'séville',
  malaga: 'málaga',
  málaga: 'málaga',
  zaragoza: 'zaragoza',
};

/** Normalise un nom de ville pour la comparaison (lowercase, trim, variantes) */
export function normalizeCity(name: string | undefined | null): string {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return '';
  return CITY_VARIANTS[trimmed] ?? trimmed;
}

/** Vérifie si deux villes correspondent (après normalisation) */
export function citiesMatch(a: string | undefined | null, b: string | undefined | null): boolean {
  const na = normalizeCity(a);
  const nb = normalizeCity(b);
  if (!na || !nb) return false;
  return na === nb;
}

/** Obtient la ville canonique à partir d'une zone recruitment */
export function cityFromZone(zone: string | undefined | null): string | null {
  if (!zone || typeof zone !== 'string') return null;
  const z = zone.toLowerCase().trim() as ZoneCode;
  return ZONE_TO_CITY[z] ?? null;
}

/** Retourne la ville canonique si elle correspond à une de nos villes, sinon la chaîne normalisée pour stockage */
export function toCanonicalCity(raw: string | undefined | null, country: Country = 'MA'): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const n = normalizeCity(raw);
  if (!n) return null;
  const cities = getCities(country);
  const found = cities.find((c) => normalizeCity(c) === n);
  return found ?? raw.trim();
}
