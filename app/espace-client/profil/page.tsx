'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClientAuth } from '@/hooks/useClientAuth';
import { FileText } from 'lucide-react';

export default function ClientProfilPage() {
  const { client, loading } = useClientAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !client) {
      router.replace('/espace-client/login');
    }
  }, [loading, client, router]);

  if (loading || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || '?';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-lg font-semibold text-gray-900 mb-6">Mon profil</h1>

        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
              {getInitials(client.name)}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-lg">{client.name}</h2>
              {client.phone && (
                <p className="text-sm text-gray-600">{client.phone}</p>
              )}
              {client.address && (
                <p className="text-sm text-gray-600 mt-1">{client.address}</p>
              )}
            </div>
          </div>
        </div>

        <Link
          href="/espace-client/documents"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 transition-colors"
        >
          <FileText className="w-6 h-6 text-primary-600" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Mes documents</p>
            <p className="text-sm text-gray-500">Factures, devis, bons de commande</p>
          </div>
          <span className="text-gray-400">→</span>
        </Link>
      </main>
    </div>
  );
}
