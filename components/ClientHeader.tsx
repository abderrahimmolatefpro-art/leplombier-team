'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useClientAuth } from '@/hooks/useClientAuth';
import { Menu, User, Settings, LogOut } from 'lucide-react';

const menuItems = [
  { href: '/espace-client/profil', label: 'Profil', icon: User },
  { href: '/espace-client/parametres', label: 'Paramètres du compte', icon: Settings },
];

export default function ClientHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { client, logout } = useClientAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-700"
            aria-label="Menu"
          >
            <Menu size={24} />
          </button>

          <Link href="/espace-client/commander" className="flex-shrink-0">
            <Image src="/logo.png" alt="Le Plombier" width={120} height={40} className="h-8 w-auto" priority />
          </Link>

          <button
            type="button"
            onClick={async () => {
              await logout();
              router.replace('/espace-client/login');
            }}
            className="p-2 -mr-2 rounded-lg hover:bg-red-50 text-red-600"
            aria-label="Déconnexion"
            title="Déconnexion"
          >
            <LogOut size={22} />
          </button>
        </div>
      </header>

      {/* Drawer menu */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-xl z-50 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Menu</h2>
              {client && (
                <p className="text-sm text-gray-500 mt-0.5">{client.name}</p>
              )}
            </div>
            <nav className="flex-1 py-4">
              {menuItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 ${
                    pathname === href || pathname.startsWith(href + '/') ? 'bg-primary-50 text-primary-700' : ''
                  }`}
                >
                  <Icon size={20} />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-gray-100 p-4">
              <button
                type="button"
                onClick={async () => {
                  setMenuOpen(false);
                  await logout();
                  router.replace('/espace-client/login');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg text-left font-medium"
              >
                <LogOut size={20} />
                Déconnexion
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
