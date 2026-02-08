/**
 * Normalise un numéro de téléphone pour Infobip (sans le +, ex: 212612345678)
 */
export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned.substring(1);
  }
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
    return cleaned;
  }
  if (cleaned.startsWith('0')) {
    return '212' + cleaned.substring(1);
  }
  if (cleaned.startsWith('212')) {
    return cleaned;
  }
  if (cleaned.length >= 9 && cleaned.length <= 10) {
    return '212' + cleaned;
  }

  return cleaned;
}

/** Retourne le numéro au format E.164 (+212612345678) pour affichage */
export function toE164(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  return normalized ? '+' + normalized : phone;
}
