import type { Metadata } from 'next';
import { RegisterFcmTokenPlombier } from '@/components/RegisterFcmTokenPlombier';
import PlombierLayoutClient from '@/components/PlombierLayoutClient';
import IntlProvider from '@/components/IntlProvider';
import { getLocale } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Espace Plombier - Le Plombier',
  description: 'Vos projets, planning et revenus',
};

export default async function EspacePlombierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getLocale();
  const messages = (await import(`@/messages/${locale}.json`)).default;
  return (
    <IntlProvider locale={locale} messages={messages}>
      <RegisterFcmTokenPlombier />
      <PlombierLayoutClient>{children}</PlombierLayoutClient>
    </IntlProvider>
  );
}
