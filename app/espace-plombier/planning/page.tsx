'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePlombierAuth } from '@/hooks/usePlombierAuth';
import { ArrowLeft, Calendar } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate } from '@/lib/utils';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_LABELS: Record<string, string> = {
  project: 'Projet',
  congé: 'Congé',
  indisponibilite: 'Indisponible',
};

export default function PlombierPlanningPage() {
  const { plombier, loading: authLoading } = usePlombierAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<any[]>([]);
  const [projects, setProjects] = useState<Record<string, string>>({});
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
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
        setProjects(projMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [plombier?.id]);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const getEntriesForDay = (day: Date) =>
    entries.filter((e) => isSameDay(new Date(e.date), day));

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
          <h1 className="text-lg font-semibold text-gray-900">Mon planning</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setWeekStart((d) => subWeeks(d, 1))}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                ←
              </button>
              <h2 className="font-semibold text-gray-900">
                {format(weekStart, 'd MMM', { locale: fr })} - {format(weekEnd, 'd MMM yyyy', { locale: fr })}
              </h2>
              <button
                onClick={() => setWeekStart((d) => addWeeks(d, 1))}
                className="p-2 rounded-lg hover:bg-gray-100"
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
                              {TYPE_LABELS[e.type] || e.type}
                            </span>
                            <div>
                              {e.projectId && (
                                <p className="font-medium text-gray-900">{projects[e.projectId] || 'Projet'}</p>
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
