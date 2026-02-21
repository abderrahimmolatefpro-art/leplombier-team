'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePlombierAuth } from '@/hooks/usePlombierAuth';
import { FolderKanban, Calendar } from 'lucide-react';
import PlombierCardSkeleton from '@/components/PlombierCardSkeleton';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate, formatCurrency } from '@/lib/utils';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

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

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'termine', label: 'Terminé' },
];

const PLANNING_TYPE_LABELS: Record<string, string> = {
  project: 'Projet',
  congé: 'Congé',
  indisponibilite: 'Indisponible',
};

type Tab = 'commandes' | 'planning';

function PlombierCommandesContent() {
  const { plombier, loading: authLoading } = usePlombierAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam === 'planning' ? 'planning' : 'commandes'
  );

  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [entries, setEntries] = useState<any[]>([]);
  const [planningProjects, setPlanningProjects] = useState<Record<string, string>>({});
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [loading, setLoading] = useState(true);
  const [planningLoading, setPlanningLoading] = useState(true);

  const filteredProjects = useMemo(() => {
    if (filterStatus === 'all') return projects.filter((p) => p.status !== 'annule');
    return projects.filter((p) => p.status === filterStatus);
  }, [projects, filterStatus]);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const getEntriesForDay = (day: Date) =>
    entries.filter((e) => isSameDay(new Date(e.date), day));

  useEffect(() => {
    if (!authLoading && !plombier) {
      router.replace('/espace-plombier/login');
      return;
    }
  }, [authLoading, plombier, router]);

  useEffect(() => {
    if (tabParam === 'planning') setActiveTab('planning');
  }, [tabParam]);

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

  useEffect(() => {
    if (!plombier?.id) return;

    const loadPlanning = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'planning'),
            where('plombierId', '==', plombier.id)
          )
        );
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            date: data.date?.toDate?.() || new Date(data.date),
          };
        });
        setEntries(list);

        const projectIds = [...new Set(list.filter((e: any) => e.projectId).map((e: any) => e.projectId))];
        const projMap: Record<string, string> = {};
        for (const pid of projectIds) {
          const pDoc = await getDoc(doc(db, 'projects', pid));
          if (pDoc.exists()) projMap[pid] = pDoc.data().title || 'Projet';
        }
        setPlanningProjects(projMap);
      } catch (err) {
        console.error(err);
      } finally {
        setPlanningLoading(false);
      }
    };

    loadPlanning();
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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg font-semibold text-gray-900">Mes commandes</h1>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setActiveTab('commandes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'commandes'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FolderKanban size={18} />
              Commandes
            </button>
            <button
              onClick={() => setActiveTab('planning')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'planning'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Calendar size={18} />
              Planning
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {activeTab === 'commandes' ? (
          loading ? (
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
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                  <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {filterStatus === 'all' ? 'Aucune commande pour le moment' : 'Aucune commande pour ce filtre'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProjects.map((p) => {
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
            </>
          )
        ) : planningLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <PlombierCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setWeekStart((d) => subWeeks(d, 1))}
                className="p-3 min-h-[44px] rounded-lg hover:bg-gray-100"
              >
                ←
              </button>
              <h2 className="font-semibold text-gray-900">
                {format(weekStart, 'd MMM', { locale: fr })} - {format(weekEnd, 'd MMM yyyy', { locale: fr })}
              </h2>
              <button
                onClick={() => setWeekStart((d) => addWeeks(d, 1))}
                className="p-3 min-h-[44px] rounded-lg hover:bg-gray-100"
              >
                →
              </button>
            </div>

            <div className="space-y-4">
              {days.map((day) => {
                const dayEntries = getEntriesForDay(day);
                return (
                  <div key={day.toISOString()} className="bg-white rounded-xl border border-gray-100 p-4">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar size={18} />
                      {format(day, 'EEEE d MMMM', { locale: fr })}
                    </h3>
                    {dayEntries.length === 0 ? (
                      <p className="text-sm text-gray-500">Aucune intervention</p>
                    ) : (
                      <div className="space-y-2">
                        {dayEntries.map((e) => (
                          <div
                            key={e.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                          >
                            <span
                              className={`px-2 py-0.5 text-xs rounded ${
                                e.type === 'project'
                                  ? 'bg-blue-100 text-blue-700'
                                  : e.type === 'congé'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {PLANNING_TYPE_LABELS[e.type] || e.type}
                            </span>
                            <div>
                              {e.projectId && (
                                <p className="font-medium text-gray-900">{planningProjects[e.projectId] || 'Projet'}</p>
                              )}
                              {(e.startTime || e.endTime) && (
                                <p className="text-sm text-gray-600">
                                  {e.startTime || '—'} - {e.endTime || '—'}
                                </p>
                              )}
                              {e.notes && <p className="text-sm text-gray-500 mt-1">{e.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function PlombierCommandesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    }>
      <PlombierCommandesContent />
    </Suspense>
  );
}
