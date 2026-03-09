import type { Country } from '@/types';

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  siret?: string;
  rc?: string;
  ice?: string;
  patente?: string;
  /** Espagne : CIF (Código de Identificación Fiscal) */
  cif?: string;
  logo?: string;
  stamp?: {
    name: string;
    address: string;
    city: string;
    image?: string; // Chemin vers l'image du tampon
  };
}

export const COUNTRY_CONFIG: Record<
  Country,
  {
    currency: string;
    locale: string;
    googleMapsRegion: string;
    googlePlacesCountry: string;
    defaultPostalCode?: string;
    taxRate: number;
    taxLabel: string;
  }
> = {
  MA: {
    currency: 'MAD',
    locale: 'fr-FR',
    googleMapsRegion: 'ma',
    googlePlacesCountry: 'ma',
    defaultPostalCode: '20000',
    taxRate: 0.2,
    taxLabel: 'TVA (20%)',
  },
  ES: {
    currency: 'EUR',
    locale: 'es-ES',
    googleMapsRegion: 'es',
    googlePlacesCountry: 'es',
    defaultPostalCode: '28001',
    taxRate: 0.21,
    taxLabel: 'IVA (21%)',
  },
};

export const SITE_CONFIG: Record<Country, { websiteUrl: string; domain: string }> = {
  MA: { websiteUrl: 'https://leplombier.ma', domain: 'leplombier.ma' },
  ES: { websiteUrl: 'https://leplombier.es', domain: 'leplombier.es' },
};

// Infos entreprise par pays (ES peut être identique ou différent)
export const companyInfoByCountry: Record<Country, CompanyInfo> = {
  MA: {
    name: 'GROUPE OGINCE',
    address: 'Rue Essanaoubre - Immeuble 2 - 4ème Etage - Appt N°12 - Casablanca',
    phone: '+212 706 404 147',
    email: 'contact@leplombier.ma',
    website: 'www.leplombier.ma',
    rc: '681785',
    ice: '003755962000004',
    patente: '34214522',
    logo: '/logo.png',
    stamp: {
      name: 'GROUPE OGINCE',
      address: '2, Rue Essanaouber N°12',
      city: '4ème Etage - Casablanca',
      image: '/stamp.png',
    },
  },
  ES: {
    name: 'GROUPE OGINCE ESPAÑA',
    address: 'Calle Ejemplo, 1 - 28001 Madrid',
    phone: '+34 600 000 000',
    email: 'contact@leplombier.es',
    website: 'www.leplombier.es',
    cif: 'B00000000',
    logo: '/logo.png',
    stamp: {
      name: 'GROUPE OGINCE ESPAÑA',
      address: 'Calle Ejemplo, 1',
      city: 'Madrid',
      image: '/stamp.png',
    },
  },
};

/** Pays actif (défini par NEXT_PUBLIC_ACTIVE_COUNTRY, défaut MA) */
export function getActiveCountry(): Country {
  const c = process.env.NEXT_PUBLIC_ACTIVE_COUNTRY;
  return c === 'ES' ? 'ES' : 'MA';
}

export function formatCurrency(amount: number, country: Country = getActiveCountry()): string {
  const { currency, locale } = COUNTRY_CONFIG[country];
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

export function getWebsiteUrl(country: Country = getActiveCountry()): string {
  return SITE_CONFIG[country].websiteUrl;
}

export function getWebsiteDomain(country: Country = getActiveCountry()): string {
  return SITE_CONFIG[country].domain;
}

/** Rétrocompatibilité : companyInfo pour MA (utiliser getCompanyInfo(country) pour ES) */
export const companyInfo: CompanyInfo = companyInfoByCountry.MA;

export function getCompanyInfo(country: Country = getActiveCountry()): CompanyInfo {
  return companyInfoByCountry[country];
}
