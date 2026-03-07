import type { Metadata } from 'next';
import { RegisterFcmTokenClient } from '@/components/RegisterFcmTokenClient';
import ClientLayoutClient from '@/components/ClientLayoutClient';
import IntlProvider from '@/components/IntlProvider';
import { getLocale } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Espace Client - Le Plombier',
  description: 'Vos commandes, documents et codes promo',
};

export default async function EspaceClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getLocale();
  const messages = (await import(`@/messages/${locale}.json`)).default;
  return (
    <IntlProvider locale={locale} messages={messages}>
      <RegisterFcmTokenClient />
      <ClientLayoutClient>{children}</ClientLayoutClient>
    </IntlProvider>
  );
}
