'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Zap, FolderKanban, ShoppingBag, Package } from 'lucide-react';

const navKeys = [
  { href: '/espace-plombier/instant', key: 'instant', icon: Zap },
  { href: '/espace-plombier/projets', key: 'projets', icon: FolderKanban },
  { href: '/espace-plombier/demandes-pieces', key: 'pieces', icon: Package },
  { href: '/espace-plombier/commandes', key: 'commandes', icon: ShoppingBag },
];

export default function PlombierNav() {
  const t = useTranslations('plumber.nav');
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-center justify-around min-h-[56px]">
        {navKeys.map(({ href, key, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 py-2 transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-500'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs mt-0.5">{t(key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
