'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePlombierAuth } from '@/hooks/usePlombierAuth';
import { ArrowLeft, FolderKanban } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate, formatCurrency } from '@/lib/utils';

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

export default function PlombierProjetsPage() {
  const { plombier, loading: authLoading } = usePlombierAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !plombier) {
      router.replace('/espace-plombier/login');
      return;
    }
  }, [authLoading, plombier, router]);

  useEffect(() => {
    if (!plombier?.id) return;

    const load = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'projects'),
            where('plombierIds', 'array-contains', plombier.id)
          )
        );
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            startDate: data.startDate?.toDate?.() || null,
            endDate: data.endDate?.toDate?.() || null,
          };
        });
        list.sort((a, b) => (new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime()));
        setProjects(list);

        const clientIds = [...new Set(list.map((p: any) => p.clientId))];
        const clientMap: Record<string, string> = {};
        for (const cid of clientIds) {
          const cDoc = await getDoc(doc(db, 'clients', cid));
          if (cDoc.exists()) clientMap[cid] = cDoc.data().name || 'Client';
        }
        setClients(clientMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [plombier?.id]);

  if (authLoading || !plombier) {
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
            href="/espace-plombier/dashboard"
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Mes projets</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun projet assigné</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((p) => {
              const plombierPercent = (p.plombierPercentage || 60) / 100;
              const share = p.plombierIds?.length
                ? ((p.amount || 0) * plombierPercent) / p.plombierIds.length
                : 0;
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-gray-900">{p.title}</h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {TYPE_LABELS[p.type] || p.type} • {clients[p.clientId] || '—'} • {formatDate(p.startDate)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        p.status === 'termine'
                          ? 'bg-green-100 text-green-700'
                          : p.status === 'en_cours'
                          ? 'bg-blue-100 text-blue-700'
                          : p.status === 'en_attente'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </div>
                  {p.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{p.description}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-sm">
                    {p.amount > 0 && (
                      <span className="text-gray-700">Montant: {formatCurrency(p.amount)}</span>
                    )}
                    {share > 0 && (
                      <span className="font-medium text-primary-600">Ma part: {formatCurrency(share)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
