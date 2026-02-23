'use client';

import { usePathname } from 'next/navigation';
import ClientHeader from './ClientHeader';
import ClientNav from './ClientNav';

export default function ClientLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideNav =
    pathname === '/espace-client/login' ||
    pathname === '/espace-client' ||
    pathname.startsWith('/espace-client/login');

  return (
    <>
      {!hideNav && <ClientHeader />}
      <div className={hideNav ? '' : 'pb-24'}>{children}</div>
      {!hideNav && <ClientNav />}
    </>
  );
}
