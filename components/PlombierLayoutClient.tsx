'use client';

import { usePathname } from 'next/navigation';
import PlombierNav from './PlombierNav';
import PlombierHeader from './PlombierHeader';

export default function PlombierLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideNav =
    pathname === '/espace-plombier/login' ||
    pathname === '/espace-plombier' ||
    pathname === '/espace-plombier/documents' ||
    pathname.startsWith('/espace-plombier/login');

  const showHeader = !hideNav;

  return (
    <>
      {showHeader && <PlombierHeader />}
      <div className={hideNav ? '' : 'pb-24'}>{children}</div>
      {!hideNav && <PlombierNav />}
    </>
  );
}
