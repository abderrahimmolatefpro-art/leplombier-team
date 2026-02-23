'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClientAuth } from '@/hooks/useClientAuth';
import { FileText } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import PlombierCardSkeleton from '@/components/PlombierCardSkeleton';

const TYPE_LABELS: Record<string, string> = {
  facture: 'Facture',
  devis: 'Devis',
  bon_commande: 'Bon de commande',
};

const STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  paye: 'Payé',
  annule: 'Annulé',
};

export default function ClientDocumentsPage() {
  const { token, loading: authLoading } = useClientAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/espace-client/login');
      return;
    }
    if (token) {
      fetch('/api/espace-client/documents', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setDocuments(data.documents || []))
        .catch(() => setDocuments([]))
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

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-lg font-semibold text-gray-900 mb-6">Mes documents</h1>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <PlombierCardSkeleton key={i} />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun document pour le moment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                href={`/espace-client/documents/${doc.id}`}
                className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:border-primary-200 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {TYPE_LABELS[doc.type] || doc.type} {doc.number}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">{formatDate(doc.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        doc.status === 'paye'
                          ? 'bg-green-100 text-green-700'
                          : doc.status === 'envoye'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {STATUS_LABELS[doc.status] || doc.status}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(doc.manualTotal ?? doc.total ?? 0)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
