'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClientAuth } from '@/hooks/useClientAuth';
import { FileText } from 'lucide-react';

export default function ClientParametresPage() {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-lg font-semibold text-gray-900 mb-6">Paramètres du compte</h1>

        <div className="space-y-2">
          <div className="p-4 bg-white rounded-xl border border-gray-100">
            <p className="text-sm font-medium text-gray-700">Nom</p>
            <p className="text-gray-900 mt-0.5">{client.name}</p>
          </div>
          {client.phone && (
            <div className="p-4 bg-white rounded-xl border border-gray-100">
              <p className="text-sm font-medium text-gray-700">Téléphone</p>
              <p className="text-gray-900 mt-0.5">{client.phone}</p>
            </div>
          )}
          {client.address && (
            <div className="p-4 bg-white rounded-xl border border-gray-100">
              <p className="text-sm font-medium text-gray-700">Adresse</p>
              <p className="text-gray-900 mt-0.5">{client.address}</p>
            </div>
          )}

          <Link
            href="/espace-client/documents"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 transition-colors"
          >
            <FileText className="w-6 h-6 text-primary-600" />
            <span className="font-medium text-gray-900">Mes documents</span>
            <span className="ml-auto text-gray-400">→</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
