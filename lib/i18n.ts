/**
 * Détection de la locale selon le pays actif (MA → fr, ES → es)
 */
export function getLocale(): 'fr' | 'es' {
  const country = process.env.NEXT_PUBLIC_ACTIVE_COUNTRY;
  return country === 'ES' ? 'es' : 'fr';
}
