import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Country } from '@/types';
import { getActiveCountry, COUNTRY_CONFIG } from '@/lib/companyConfig';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, locale?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale || 'fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string, locale?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale || 'fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** Format montant selon le pays (MA → MAD, ES → EUR). Par défaut : getActiveCountry(). */
export function formatCurrency(amount: number, country?: Country): string {
  const c = country ?? getActiveCountry();
  const { currency, locale } = COUNTRY_CONFIG[c];
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatNumberFR(num: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/** Plombier assignable (documents validés par admin). Les plombiers sans validationStatus (legacy) sont considérés assignables. */
export function isPlombierAssignable(plombier: { validationStatus?: string }): boolean {
  const s = plombier.validationStatus;
  return s === 'validated' || !s;
}
