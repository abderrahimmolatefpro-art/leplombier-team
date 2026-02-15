'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { usePlombierAuth } from '@/hooks/usePlombierAuth';
import { FolderKanban, Calendar, DollarSign, LogOut, Zap } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatCurrency } from '@/lib/utils';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function PlombierDashboardPage() {
  const { plombier, loading, logout } = usePlombierAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ projectsCount: 0, monthRevenue: 0 });
  const [available, setAvailable] = useState(false);
  const [loadingToggle, setLoadingToggle] = useState(false);
  const [toggleError, setToggleError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef<number>(0);

  const loadStats = useCallback(async () => {
    if (!plombier?.id) return;
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const projectsSnap = await getDocs(
        query(
          collection(db, 'projects'),
          where('plombierIds', 'array-contains', plombier.id)
        )
      );
      const projects = projectsSnap.docs
        .map((d) => ({ ...d.data(), id: d.id }))
        .filter((p: any) => p.status !== 'annule' && p.status !== 'termine');
      const projectsCount = projects.length;

      const revenuesSnap = await getDocs(
        query(
          collection(db, 'manualRevenues'),
          where('plombierId', '==', plombier.id)
        )
      );
      const revenues = revenuesSnap.docs
        .filter((d) => !d.data().deleted)
        .map((d) => ({ ...d.data(), id: d.id }));
      const monthRevenues = revenues.filter((r: any) => {
        const d = r.date?.toDate ? r.date.toDate() : new Date(r.date);
        return d >= monthStart && d <= monthEnd;
      });
      const plombierPercent = 0.6;
      const monthRevenue = monthRevenues.reduce(
        (sum: number, r: any) => sum + (r.amount || 0) * plombierPercent,
        0
      );

      setStats({ projectsCount, monthRevenue });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, [plombier?.id]);

  useEffect(() => {
    if (!loading && !plombier) {
      router.replace('/espace-plombier/login');
    }
  }, [loading, plombier, router]);

  useEffect(() => {
    if (!plombier) return;
    if (plombier.validationStatus === 'pending_documents') {
      router.replace('/espace-plombier/documents');
    }
  }, [plombier, router]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!plombier?.id) return;
    getDoc(doc(db, 'users', plombier.id)).then((snap) => {
      setAvailable(!!(snap.exists() && snap.data()?.availableForInstant));
    });
  }, [plombier?.id]);

  const handleToggleAvailability = async () => {
    if (!plombier?.id) return;
    setLoadingToggle(true);
    setToggleError('');
    try {
      await updateDoc(doc(db, 'users', plombier.id), {
        availableForInstant: !available,
        updatedAt: Timestamp.now(),
      });
      setAvailable(!available);
    } catch (err) {
      console.error(err);
      setToggleError('Impossible de modifier la disponibilité');
    } finally {
      setLoadingToggle(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/espace-plombier/login');
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const scrollTop = document.documentElement.scrollTop ?? document.body.scrollTop ?? 0;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchEndY - touchStartY.current;
    if (scrollTop === 0 && deltaY > 50) {
      setRefreshing(true);
      loadStats().finally(() => {
        setTimeout(() => setRefreshing(false), 1000);
      });
    }
  };

  if (loading || !plombier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Le Plombier" width={120} height={40} className="h-8 w-auto" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{plombier.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <LogOut size={18} />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main
        className="max-w-4xl mx-auto px-4 py-8"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {refreshing && (
          <div className="mb-4 text-center text-sm text-gray-500">Actualisation...</div>
        )}
        {plombier.validationStatus === 'documents_submitted' && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            Vos documents sont en attente de validation par l&apos;administrateur. Certaines actions
            peuvent être limitées.
          </div>
        )}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {plombier.name}</h1>
          <p className="text-gray-600 mt-1">Retrouvez vos projets, planning et revenus</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-sm text-gray-500">Projets en cours</p>
            <p className="text-2xl font-bold text-gray-900">{stats.projectsCount}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-sm text-gray-500">Revenus ce mois</p>
            <p className="text-2xl font-bold text-primary-600">{formatCurrency(stats.monthRevenue)}</p>
          </div>
        </div>

        <div className="mb-8 bg-primary-50 rounded-xl shadow-sm border border-primary-100 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Zap className="w-10 h-10 text-primary-600 flex-shrink-0" />
              <div>
                <h2 className="font-semibold text-gray-900">Interventions instantanées</h2>
                <p className="text-sm text-gray-500 mt-0.5">Activez pour recevoir des demandes</p>
              </div>
            </div>
            <button
              onClick={handleToggleAvailability}
              disabled={loadingToggle || plombier.validationStatus === 'documents_submitted'}
              className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 ${
                available ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition ${
                  available ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {toggleError && <p className="text-sm text-red-600 mt-2">{toggleError}</p>}
          {available && (
            <Link
              href="/espace-plombier/instant"
              className="inline-flex items-center gap-2 mt-4 text-primary-600 font-medium hover:underline"
            >
              <Zap size={18} />
              Voir les demandes
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2">
          <Link
            href="/espace-plombier/projets"
            className="block p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
          >
            <FolderKanban className="w-10 h-10 text-primary-600 mb-3" />
            <h2 className="font-semibold text-gray-900">Mes projets</h2>
            <p className="text-sm text-gray-500 mt-1">Projets assignés</p>
          </Link>

          <Link
            href="/espace-plombier/planning"
            className="block p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
          >
            <Calendar className="w-10 h-10 text-primary-600 mb-3" />
            <h2 className="font-semibold text-gray-900">Mon planning</h2>
            <p className="text-sm text-gray-500 mt-1">Agenda et interventions</p>
          </Link>

          <Link
            href="/espace-plombier/revenus"
            className="block p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
          >
            <DollarSign className="w-10 h-10 text-primary-600 mb-3" />
            <h2 className="font-semibold text-gray-900">Mes revenus</h2>
            <p className="text-sm text-gray-500 mt-1">Dépannages et gains</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
