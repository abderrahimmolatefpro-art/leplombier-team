export type PhoneCountry = 'MA' | 'ES';

/**
 * Normalise un numéro de téléphone pour Infobip (sans le +, ex: 212612345678 ou 34612345678)
 * @param country Pays pour interpréter les numéros sans indicatif (défaut: MA)
 */
export function normalizePhoneNumber(phone: string, country: PhoneCountry = 'MA'): string {
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // Déjà avec indicatif international
  if (cleaned.startsWith('212')) return cleaned;
  if (cleaned.startsWith('34')) return cleaned;

  // Format local Maroc : 0XXXXXXXX
  if (country === 'MA' && cleaned.startsWith('0')) {
    return '212' + cleaned.substring(1);
  }
  if (country === 'MA' && cleaned.length >= 9 && cleaned.length <= 10) {
    return '212' + cleaned;
  }

  // Format local Espagne : 6XX ou 7XX (9 chiffres, mobile)
  if (country === 'ES' && cleaned.length === 9 && /^[67]\d{8}$/.test(cleaned)) {
    return '34' + cleaned;
  }

  return cleaned;
}

/** Retourne le numéro au format E.164 (+212612345678) pour affichage */
export function toE164(phone: string, country: PhoneCountry = 'MA'): string {
  const normalized = normalizePhoneNumber(phone, country);
  return normalized ? '+' + normalized : phone;
}
