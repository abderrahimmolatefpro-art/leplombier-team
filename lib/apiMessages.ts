import type { Country } from '@/types';

type Locale = 'fr' | 'es';

const MESSAGES: Record<Locale, Record<string, string>> = {
  fr: {
    PHONE_REQUIRED: 'Numéro de téléphone requis',
    PHONE_CODE_REQUIRED: 'Téléphone et code requis',
    PHONE_NOT_FOUND: 'Numéro non reconnu',
    NO_CODE_SENT: "Aucun code envoyé. Cliquez sur 'Envoyer le code' pour en recevoir un.",
    INVALID_CODE: 'Code incorrect. Vérifiez le code reçu par SMS.',
    CODE_ALREADY_SENT: 'Un code vous a déjà été envoyé. Consultez vos SMS pour le retrouver.',
    SMS_SEND_ERROR: "Erreur lors de l'envoi du SMS",
    SERVER_ERROR: 'Erreur serveur',
  },
  es: {
    PHONE_REQUIRED: 'Número de teléfono requerido',
    PHONE_CODE_REQUIRED: 'Teléfono y código requeridos',
    PHONE_NOT_FOUND: 'Número no reconocido',
    NO_CODE_SENT: 'Ningún código enviado. Haga clic en "Enviar código" para recibir uno.',
    INVALID_CODE: 'Código incorrecto. Verifique el código recibido por SMS.',
    CODE_ALREADY_SENT: 'Ya se le ha enviado un código. Consulte sus SMS para encontrarlo.',
    SMS_SEND_ERROR: 'Error al enviar el SMS',
    SERVER_ERROR: 'Error del servidor',
  },
};

export function getApiMessage(key: string, country: Country = 'MA'): string {
  const locale: Locale = country === 'ES' ? 'es' : 'fr';
  return MESSAGES[locale][key] ?? MESSAGES.fr[key] ?? key;
}

const SMS_CODE_TEMPLATES: Record<Locale, (code: string) => string> = {
  fr: (code) => `Votre code d'accès Le Plombier: ${code}. Utilisez ce code pour vous connecter.`,
  es: (code) => `Su código de acceso Le Plombier: ${code}. Use este código para conectarse.`,
};

export function getSmsCodeMessage(country: Country, code: string): string {
  const locale: Locale = country === 'ES' ? 'es' : 'fr';
  return SMS_CODE_TEMPLATES[locale](code);
}
