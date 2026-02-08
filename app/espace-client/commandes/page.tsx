'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClientAuth } from '@/hooks/useClientAuth';
import { ArrowLeft, FolderKanban } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const TYPE_LABELS: Record<string, string> = {
  recherche_fuite: 'Recherche de fuite',
  reparation_lourde: 'Réparation lourde',
  renovation_salle_bain: 'Rénovation salle de bain',
};

const STATUS_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  en_pause: 'En pause',
  termine: 'Terminé',
  annule: 'Annulé',
};

export default function ClientCommandesPage() {
  const { token, loading: authLoading } = useClientAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/espace-client/login');
      return;
    }
    if (token) {
      fetch('/api/espace-client/orders', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setOrders(data.orders || []))
        .catch(() => setOrders([]))
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
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link
            href="/espace-client/dashboard"
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Mes commandes</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune commande pour le moment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-gray-900">{order.title}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {TYPE_LABELS[order.type] || order.type} • {formatDate(order.startDate)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      order.status === 'termine'
                        ? 'bg-green-100 text-green-700'
                        : order.status === 'en_cours'
                        ? 'bg-blue-100 text-blue-700'
                        : order.status === 'en_attente'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
                {order.description && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{order.description}</p>
                )}
                {order.amount > 0 && (
                  <p className="text-sm font-medium text-gray-900 mt-2">
                    {order.amount?.toLocaleString('fr-FR')} MAD
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
