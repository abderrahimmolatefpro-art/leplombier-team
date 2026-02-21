'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { usePlombierAuth } from '@/hooks/usePlombierAuth';
import { Menu, User, DollarSign, Settings } from 'lucide-react';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function PlombierHeader() {
  const pathname = usePathname();
  const { plombier } = usePlombierAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [available, setAvailable] = useState(false);
  const [loadingToggle, setLoadingToggle] = useState(false);
  const [toggleError, setToggleError] = useState('');

  const isInstantPage = pathname === '/espace-plombier/instant';

  useEffect(() => {
    if (!plombier?.id || !isInstantPage) return;
    getDoc(doc(db, 'users', plombier.id)).then((snap) => {
      setAvailable(!!(snap.exists() && snap.data()?.availableForInstant));
    });
  }, [plombier?.id, isInstantPage]);

  const handleToggleAvailability = async () => {
    if (!plombier?.id) return;
    setLoadingToggle(true);
    setToggleError('');
    try {
      await updateDoc(doc(db, 'users', plombier.id), {
        availableForInstant: !available,
        updatedAt: Timestamp.now(),
      });
      setAvailable(!available);
    } catch (err) {
      console.error(err);
      setToggleError('Impossible de modifier la disponibilité');
    } finally {
      setLoadingToggle(false);
    }
  };

  const menuItems = [
    { href: '/espace-plombier/profil', label: 'Profil', icon: User },
    { href: '/espace-plombier/revenus', label: 'Revenus', icon: DollarSign },
  ];

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

          {isInstantPage ? (
            <button
              type="button"
              onClick={handleToggleAvailability}
              disabled={loadingToggle}
              className={`flex-1 max-w-[200px] py-2.5 px-4 rounded-full font-medium text-sm transition-colors ${
                available
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {available ? 'En ligne' : 'Hors ligne'}
            </button>
          ) : (
            <div className="flex-1" />
          )}

          <div className="w-10" />
        </div>
        {toggleError && (
          <p className="text-sm text-red-600 text-center px-4 pb-2">{toggleError}</p>
        )}
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
              {plombier && (
                <p className="text-sm text-gray-500 mt-0.5">{plombier.name}</p>
              )}
            </div>
            <nav className="flex-1 py-4">
              {menuItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 ${
                    pathname === href ? 'bg-primary-50 text-primary-700' : ''
                  }`}
                >
                  <Icon size={20} />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-gray-100 p-4">
              <Link
                href="/espace-plombier/parametres"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                <Settings size={20} />
                Paramètres du compte
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
