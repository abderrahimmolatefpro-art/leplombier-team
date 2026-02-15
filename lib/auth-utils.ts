/**
 * Convertit un numéro de téléphone en email interne pour Firebase Auth.
 * Firebase Auth exige un email pour signInWithEmailAndPassword.
 */
export function phoneToAuthEmail(phone: string): string {
  const normalized = phone.replace(/\D/g, '');
  return `${normalized}@leplombier.ma`;
}

/**
 * Génère un mot de passe aléatoire (caractères alphanumériques sans ambiguïté).
 */
export function generatePassword(length = 8): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
