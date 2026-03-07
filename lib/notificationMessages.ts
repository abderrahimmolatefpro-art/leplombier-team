import type { Country } from '@/types';

type Locale = 'fr' | 'es';

const NOTIF: Record<Locale, Record<string, string | ((a: string, b?: string) => string)>> = {
  fr: {
    newRequestTitle: 'Nouvelle demande — disponible maintenant',
    newRequestBodyFallback: 'Une nouvelle demande est disponible',
    newOfferTitle: 'Nouvelle offre',
    newOfferBody: (name: string, amount?: string) => `${name} propose ${amount ?? ''}`,
    plombierArrived: 'Plombier arrivé',
    plombierArrivedBody: (name: string) => `${name} est devant chez vous`,
    interventionComplete: 'Intervention terminée',
    interventionCompleteBody: 'Votre intervention est terminée',
    etaSet: 'Heure d\'arrivée mise à jour',
    etaSetBody: (eta: string) => `Arrivée prévue : ${eta}`,
    photosReceived: 'Photos reçues',
    photosReceivedBody: 'Le client a envoyé des photos.',
    requestReady: 'Demande prête',
    requestReadyBody: 'Le client a confirmé. Vous pouvez vous rendre sur place.',
    requestCancelled: 'Demande annulée',
    requestCancelledBody: 'Le client a annulé la demande.',
    offerAccepted: 'Votre offre a été acceptée',
    offerAcceptedBodyAddress: (addr: string) => `– ${addr}`,
    offerAcceptedBodyFallback: 'Le client a accepté votre offre',
  },
  es: {
    newRequestTitle: 'Nueva solicitud — disponible ahora',
    newRequestBodyFallback: 'Hay una nueva solicitud disponible',
    newOfferTitle: 'Nueva oferta',
    newOfferBody: (name: string, amount?: string) => `${name} propone ${amount ?? ''}`,
    plombierArrived: 'Fontanero llegado',
    plombierArrivedBody: (name: string) => `${name} está delante de su puerta`,
    interventionComplete: 'Intervención completada',
    interventionCompleteBody: 'Su intervención está terminada',
    etaSet: 'Hora de llegada actualizada',
    etaSetBody: (eta: string) => `Llegada prevista: ${eta}`,
    photosReceived: 'Fotos recibidas',
    photosReceivedBody: 'El cliente ha enviado fotos.',
    requestReady: 'Solicitud lista',
    requestReadyBody: 'El cliente ha confirmado. Puede acudir al lugar.',
    requestCancelled: 'Solicitud cancelada',
    requestCancelledBody: 'El cliente ha cancelado la solicitud.',
    offerAccepted: 'Su oferta ha sido aceptada',
    offerAcceptedBodyAddress: (addr: string) => `– ${addr}`,
    offerAcceptedBodyFallback: 'El cliente ha aceptado su oferta',
  },
};

function getLocale(country: Country): Locale {
  return country === 'ES' ? 'es' : 'fr';
}

export function getNotifMessage(
  key: string,
  country: Country = 'MA',
  ...args: string[]
): string {
  const locale = getLocale(country);
  const val = NOTIF[locale][key] ?? NOTIF.fr[key];
  if (typeof val === 'function') {
    return (val as (a: string, b?: string) => string)(args[0], args[1]);
  }
  return (val as string) ?? key;
}
