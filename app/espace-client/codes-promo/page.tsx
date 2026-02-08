'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClientAuth } from '@/hooks/useClientAuth';
import { ArrowLeft, Tag } from 'lucide-react';

export default function ClientCodesPromoPage() {
  const { token, loading: authLoading } = useClientAuth();
  const router = useRouter();
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/espace-client/login');
      return;
    }
    if (token) {
      fetch('/api/espace-client/promo-codes', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setPromoCodes(data.promoCodes || []))
        .catch(() => setPromoCodes([]))
        .finally(() => setLoading(false));
    }
  }, [token, authLoading, router]);

  if (authLoading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const formatDiscount = (p: any) => {
    if (p.discountType === 'percent') return `${p.discountValue}% de réduction`;
    return `${p.discountValue} MAD de réduction`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link
            href="/espace-client/dashboard"
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Mes codes promo</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        ) : promoCodes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun code promo actif pour le moment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {promoCodes.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 border-l-4 border-l-primary-500"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-block px-2 py-0.5 bg-primary-100 text-primary-700 text-sm font-mono font-semibold rounded">
                      {p.code}
                    </span>
                    <h2 className="font-semibold text-gray-900 mt-2">{p.label}</h2>
                    <p className="text-sm text-gray-600 mt-1">{formatDiscount(p)}</p>
                    {p.expiresAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Valable jusqu'au {new Date(p.expiresAt).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
