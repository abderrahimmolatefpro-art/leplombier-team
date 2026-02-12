import type { Metadata } from 'next';
import { RegisterFcmTokenPlombier } from '@/components/RegisterFcmTokenPlombier';
import PlombierLayoutClient from '@/components/PlombierLayoutClient';

export const metadata: Metadata = {
  title: 'Espace Plombier - Le Plombier',
  description: 'Vos projets, planning et revenus',
};

export default function EspacePlombierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RegisterFcmTokenPlombier />
      <PlombierLayoutClient>{children}</PlombierLayoutClient>
    </>
  );
}
