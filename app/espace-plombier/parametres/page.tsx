'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePlombierAuth } from '@/hooks/usePlombierAuth';
import { CITIES } from '@/lib/cities';
import { FileText, LogOut, MapPin } from 'lucide-react';

export default function PlombierParametresPage() {
  const { plombier, loading, logout } = usePlombierAuth();
  const router = useRouter();
  const [city, setCity] = useState<string>(plombier?.city ?? '');
  const [savingCity, setSavingCity] = useState(false);

  useEffect(() => {
    if (!loading && !plombier) {
      router.replace('/espace-plombier/login');
    }
  }, [loading, plombier, router]);

  useEffect(() => {
    if (plombier?.city !== undefined) {
      setCity(plombier.city ?? '');
    }
  }, [plombier?.city]);

  const handleCityChange = async (newCity: string) => {
    if (!plombier) return;
    setCity(newCity);
    setSavingCity(true);
    try {
      await updateDoc(doc(db, 'users', plombier.id), {
        city: newCity || null,
        updatedAt: new Date(),
      });
    } catch (e) {
      console.error('Erreur mise à jour ville:', e);
      setCity(plombier.city ?? '');
    } finally {
      setSavingCity(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/espace-plombier/login');
  };

  if (loading || !plombier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-lg font-semibold text-gray-900 mb-6">Paramètres du compte</h1>

        <div className="space-y-2">
          <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100">
            <MapPin className="w-6 h-6 text-primary-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                Ma ville
              </label>
              <select
                id="city"
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                disabled={savingCity}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-60"
              >
                <option value="">Sélectionner une ville</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Les demandes instantanées affichées seront filtrées par votre ville.
              </p>
            </div>
          </div>

          <Link
            href="/espace-plombier/documents"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 transition-colors"
          >
            <FileText className="w-6 h-6 text-primary-600" />
            <span className="font-medium text-gray-900">Documents de validation</span>
            <span className="ml-auto text-gray-400">→</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-colors text-left"
          >
            <LogOut className="w-6 h-6 text-red-600" />
            <span className="font-medium text-gray-900">Déconnexion</span>
          </button>
        </div>
      </main>
    </div>
  );
}
