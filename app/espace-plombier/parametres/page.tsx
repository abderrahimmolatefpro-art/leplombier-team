'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePlombierAuth } from '@/hooks/usePlombierAuth';
import { Settings, FileText, LogOut } from 'lucide-react';

export default function PlombierParametresPage() {
  const { plombier, loading, logout } = usePlombierAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !plombier) {
      router.replace('/espace-plombier/login');
    }
  }, [loading, plombier, router]);

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
