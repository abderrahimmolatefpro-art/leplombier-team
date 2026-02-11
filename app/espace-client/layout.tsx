import type { Metadata } from 'next';
import { RegisterFcmTokenClient } from '@/components/RegisterFcmTokenClient';

export const metadata: Metadata = {
  title: 'Espace Client - Le Plombier',
  description: 'Vos commandes, documents et codes promo',
};

export default function EspaceClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RegisterFcmTokenClient />
      {children}
    </>
  );
}
