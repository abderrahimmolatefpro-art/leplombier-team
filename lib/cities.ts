/**
 * Villes et zones pour le filtrage plombier/client (style inDrive)
 */

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

export const CITIES = [
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

/** Normalise un nom de ville pour la comparaison (lowercase, trim, variantes) */
export function normalizeCity(name: string | undefined | null): string {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return '';
  // Variantes courantes
  const variants: Record<string, string> = {
    casa: 'casablanca',
    'casablanca': 'casablanca',
    'casa blanca': 'casablanca',
    tetouan: 'tétouan',
    'tétouan': 'tétouan',
    fes: 'fès',
    'fès': 'fès',
    'fez': 'fès',
  };
  return variants[trimmed] ?? trimmed;
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
export function toCanonicalCity(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const n = normalizeCity(raw);
  if (!n) return null;
  const found = CITIES.find((c) => normalizeCity(c) === n);
  return found ?? raw.trim();
}
