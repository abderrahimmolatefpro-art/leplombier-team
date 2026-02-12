'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useClientAuth } from '@/hooks/useClientAuth';
import { FolderKanban, FileText, Tag, LogOut, Zap } from 'lucide-react';

export default function ClientDashboardPage() {
  const { client, loading, token, logout } = useClientAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ ordersInProgress: 0, documentsCount: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef<number>(0);

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const [ordersRes, docsRes] = await Promise.all([
        fetch('/api/espace-client/orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/espace-client/documents', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const ordersData = await ordersRes.json();
      const docsData = await docsRes.json();
      const orders = ordersData.orders || [];
      const documents = docsData.documents || [];
      const ordersInProgress = orders.filter(
        (o: { status?: string }) => o.status !== 'termine' && o.status !== 'annule'
      ).length;
      setStats({ ordersInProgress, documentsCount: documents.length });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, [token]);

  useEffect(() => {
    if (!loading && !token) {
      router.replace('/espace-client/login');
    }
  }, [loading, token, router]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleLogout = () => {
    logout();
    router.replace('/espace-client/login');
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

  if (loading || !client) {
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
            <span className="text-sm text-gray-600">{client.name}</span>
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {client.name}</h1>
          <p className="text-gray-600 mt-1">Retrouvez vos commandes, documents et codes promo</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-sm text-gray-500">Commandes en cours</p>
            <p className="text-2xl font-bold text-gray-900">{stats.ordersInProgress}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-sm text-gray-500">Documents</p>
            <p className="text-2xl font-bold text-primary-600">{stats.documentsCount}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2">
          <Link
            href="/espace-client/commander"
            className="block p-4 sm:p-6 bg-primary-50 rounded-xl shadow-sm border border-primary-100 hover:border-primary-200 hover:shadow-md transition-all"
          >
            <Zap className="w-10 h-10 text-primary-600 mb-3" />
            <h2 className="font-semibold text-gray-900">Commander un plombier</h2>
            <p className="text-sm text-gray-500 mt-1">Intervention immédiate, disponible maintenant</p>
          </Link>

          <Link
            href="/espace-client/commandes"
            className="block p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
          >
            <FolderKanban className="w-10 h-10 text-primary-600 mb-3" />
            <h2 className="font-semibold text-gray-900">Mes commandes</h2>
            <p className="text-sm text-gray-500 mt-1">Suivez vos projets et interventions</p>
          </Link>

          <Link
            href="/espace-client/documents"
            className="block p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
          >
            <FileText className="w-10 h-10 text-primary-600 mb-3" />
            <h2 className="font-semibold text-gray-900">Mes documents</h2>
            <p className="text-sm text-gray-500 mt-1">Factures, devis et bons de commande</p>
          </Link>

          <Link
            href="/espace-client/codes-promo"
            className="block p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
          >
            <Tag className="w-10 h-10 text-primary-600 mb-3" />
            <h2 className="font-semibold text-gray-900">Mes codes promo</h2>
            <p className="text-sm text-gray-500 mt-1">Offres et réductions actives</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
