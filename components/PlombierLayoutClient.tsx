'use client';

import { usePathname } from 'next/navigation';
import PlombierNav from './PlombierNav';

export default function PlombierLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideNav =
    pathname === '/espace-plombier/login' ||
    pathname === '/espace-plombier' ||
    pathname.startsWith('/espace-plombier/login');

  return (
    <>
      <div className={hideNav ? '' : 'pb-24'}>{children}</div>
      {!hideNav && <PlombierNav />}
    </>
  );
}
