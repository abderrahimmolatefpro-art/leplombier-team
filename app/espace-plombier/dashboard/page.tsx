'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { usePlombierAuth } from '@/hooks/usePlombierAuth';
import { FolderKanban, Calendar, DollarSign, LogOut, Zap } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatCurrency } from '@/lib/utils';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function PlombierDashboardPage() {
  const { plombier, loading, logout } = usePlombierAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ projectsCount: 0, monthRevenue: 0 });

  useEffect(() => {
    if (!loading && !plombier) {
      router.replace('/espace-plombier/login');
    }
  }, [loading, plombier, router]);

  useEffect(() => {
    if (!plombier?.id) return;

    const loadStats = async () => {
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
        const revenues = revenuesSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
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
    };

    loadStats();
  }, [plombier?.id]);

  const handleLogout = () => {
    logout();
    router.replace('/espace-plombier/login');
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
      <header className="bg-white border-b border-gray-200 px-4 py-4">
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

      <main className="max-w-4xl mx-auto px-4 py-8">
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/espace-plombier/instant"
            className="block p-6 bg-primary-50 rounded-xl shadow-sm border border-primary-100 hover:border-primary-200 hover:shadow-md transition-all"
          >
            <Zap className="w-10 h-10 text-primary-600 mb-3" />
            <h2 className="font-semibold text-gray-900">Interventions instantanées</h2>
            <p className="text-sm text-gray-500 mt-1">Accepter des missions en direct</p>
          </Link>

          <Link
            href="/espace-plombier/projets"
            className="block p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
          >
            <FolderKanban className="w-10 h-10 text-primary-600 mb-3" />
            <h2 className="font-semibold text-gray-900">Mes projets</h2>
            <p className="text-sm text-gray-500 mt-1">Projets assignés</p>
          </Link>

          <Link
            href="/espace-plombier/planning"
            className="block p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
          >
            <Calendar className="w-10 h-10 text-primary-600 mb-3" />
            <h2 className="font-semibold text-gray-900">Mon planning</h2>
            <p className="text-sm text-gray-500 mt-1">Agenda et interventions</p>
          </Link>

          <Link
            href="/espace-plombier/revenus"
            className="block p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
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
