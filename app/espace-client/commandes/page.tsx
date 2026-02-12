'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useClientAuth } from '@/hooks/useClientAuth';
import { FolderKanban } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import PlombierCardSkeleton from '@/components/PlombierCardSkeleton';

const TYPE_LABELS: Record<string, string> = {
  recherche_fuite: 'Recherche de fuite',
  reparation_lourde: 'Réparation lourde',
  renovation_salle_bain: 'Rénovation salle de bain',
};

const getTypeLabel = (order: { type?: string; projectType?: string }) => {
  if (order.type === 'depannage') return 'Dépannage';
  return TYPE_LABELS[order.projectType || ''] || order.projectType || 'Intervention';
};

const STATUS_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  en_pause: 'En pause',
  termine: 'Terminé',
  annule: 'Annulé',
};

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'termine', label: 'Terminé' },
];

export default function ClientCommandesPage() {
  const { token, loading: authLoading } = useClientAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredOrders = useMemo(() => {
    if (filterStatus === 'all') return orders.filter((o) => o.status !== 'annule');
    return orders.filter((o) => o.status === filterStatus);
  }, [orders, filterStatus]);

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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg font-semibold text-gray-900">Mes commandes</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <PlombierCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            <div className="flex gap-2 flex-wrap mb-6">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStatus(opt.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    filterStatus === opt.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {filterStatus === 'all' ? 'Aucune commande pour le moment' : 'Aucune commande pour ce filtre'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-gray-900">{order.title}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {getTypeLabel(order)} • {formatDate(order.startDate || order.createdAt)}
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
                {order.amount && order.amount > 0 && (
                  <p className="text-sm font-medium text-gray-900 mt-2">
                    {order.amount?.toLocaleString('fr-FR')} MAD
                  </p>
                )}
              </div>
            ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
