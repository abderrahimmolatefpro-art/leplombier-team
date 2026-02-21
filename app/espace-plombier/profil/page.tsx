'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePlombierAuth } from '@/hooks/usePlombierAuth';
import { User, FileText, BadgeCheck } from 'lucide-react';

export default function PlombierProfilPage() {
  const { plombier, loading } = usePlombierAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !plombier) {
      router.replace('/espace-plombier/login');
    }
  }, [loading, plombier, router]);


  if (loading || !plombier) {
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

  const statusLabel =
    plombier.validationStatus === 'validated'
      ? 'Compte validé'
      : plombier.validationStatus === 'documents_submitted'
      ? 'Documents en attente'
      : 'En attente';

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-lg font-semibold text-gray-900 mb-6">Mon profil</h1>

        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
              {getInitials(plombier.name)}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-lg">{plombier.name}</h2>
              {plombier.phone && (
                <p className="text-sm text-gray-600">{plombier.phone}</p>
              )}
              {plombier.email && (
                <p className="text-sm text-gray-600">{plombier.email}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {plombier.certified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-primary-100 text-primary-700">
                    <BadgeCheck size={14} />
                    Certifié
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">{statusLabel}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <Link
          href="/espace-plombier/documents"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 transition-colors"
        >
          <FileText className="w-6 h-6 text-primary-600" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Documents de validation</p>
            <p className="text-sm text-gray-500">Carte d&apos;identité, selfie</p>
          </div>
          <span className="text-gray-400">→</span>
        </Link>
      </main>
    </div>
  );
}
