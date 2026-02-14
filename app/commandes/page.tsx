'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, Client, ManualRevenue, InstantRequest } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ShoppingCart, FolderKanban, Wrench, TrendingUp, Trash2, Calendar, ChevronDown, X } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';

type DatePreset = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom';

interface DateRange {
  start: Date;
  end: Date;
}

type CommandeItem = {
  id: string;
  clientId: string;
  type: 'Projet' | 'Dépannage' | 'Intervention instantanée';
  name: string;
  clientName: string;
  status: string;
  amount: number;
  date: Date;
};

export default function CommandesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [manualRevenues, setManualRevenues] = useState<ManualRevenue[]>([]);
  const [instantRequests, setInstantRequests] = useState<InstantRequest[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [includeExpiredCancelled, setIncludeExpiredCancelled] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) loadData();
  }, [user, authLoading, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showDatePicker && !target.closest('.date-picker-container')) {
        setShowDatePicker(false);
      }
    };
    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDatePicker]);

  const getDateRange = useMemo((): DateRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start: Date;
    let end: Date = new Date(today);
    end.setHours(23, 59, 59, 999);

    if (datePreset === 'custom' && customStartDate && customEndDate) {
      start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
    } else {
      switch (datePreset) {
        case 'today':
          start = new Date(today);
          start.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          start = new Date(today);
          start.setDate(start.getDate() - 1);
          start.setHours(0, 0, 0, 0);
          end = new Date(start);
          end.setHours(23, 59, 59, 999);
          break;
        case 'last7days':
          start = new Date(today);
          start.setDate(start.getDate() - 6);
          start.setHours(0, 0, 0, 0);
          break;
        case 'last30days':
          start = new Date(today);
          start.setDate(start.getDate() - 29);
          start.setHours(0, 0, 0, 0);
          break;
        case 'thisMonth':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          start.setHours(0, 0, 0, 0);
          break;
        case 'lastMonth':
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          start.setHours(0, 0, 0, 0);
          end = new Date(now.getFullYear(), now.getMonth(), 0);
          end.setHours(23, 59, 59, 999);
          break;
        case 'thisYear':
          start = new Date(now.getFullYear(), 0, 1);
          start.setHours(0, 0, 0, 0);
          break;
        case 'lastYear':
          start = new Date(now.getFullYear() - 1, 0, 1);
          start.setHours(0, 0, 0, 0);
          end = new Date(now.getFullYear() - 1, 11, 31);
          end.setHours(23, 59, 59, 999);
          break;
        default:
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          start.setHours(0, 0, 0, 0);
      }
    }
    return { start, end };
  }, [datePreset, customStartDate, customEndDate]);

  const loadData = async () => {
    try {
      const [projectsSnap, clientsSnap, revenuesSnap, instantSnap] = await Promise.all([
        getDocs(query(collection(db, 'projects'))),
        getDocs(query(collection(db, 'clients'))),
        getDocs(query(collection(db, 'manualRevenues'))),
        getDocs(query(collection(db, 'instantRequests'))),
      ]);

      setProjects(projectsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        startDate: d.data().startDate?.toDate() || new Date(),
        endDate: d.data().endDate?.toDate(),
        amount: d.data().amount || 0,
        hasInvoice: d.data().hasInvoice || false,
        createdAt: d.data().createdAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || new Date(),
      })) as Project[]);

      setClients(clientsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || new Date(),
      })) as Client[]);

      setManualRevenues(
        revenuesSnap.docs
          .filter((d) => !d.data().deleted)
          .map((d) => ({
            id: d.id,
            ...d.data(),
            date: d.data().date?.toDate() || new Date(),
            createdAt: d.data().createdAt?.toDate() || new Date(),
            updatedAt: d.data().updatedAt?.toDate() || new Date(),
          })) as ManualRevenue[]
      );

      setInstantRequests(instantSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
        acceptedAt: d.data().acceptedAt?.toDate(),
        expiresAt: d.data().expiresAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate(),
      })) as InstantRequest[]);
    } catch (error) {
      console.error('Error loading commandes:', error);
    } finally {
      setLoading(false);
    }
  };

  const allCommandes = useMemo((): CommandeItem[] => {
    const items: CommandeItem[] = [];
    const existingClientIds = new Set(clients.map((c) => c.id));

    projects.forEach((p) => {
      if (!existingClientIds.has(p.clientId)) return;
      items.push({
        id: p.id,
        clientId: p.clientId,
        type: 'Projet',
        name: p.title || 'Sans titre',
        clientName: clients.find((c) => c.id === p.clientId)?.name || 'Inconnu',
        status: p.status,
        amount: p.amount || 0,
        date: p.createdAt || p.startDate,
      });
    });

    manualRevenues.forEach((r) => {
      if (!existingClientIds.has(r.clientId)) return;
      items.push({
        id: r.id,
        clientId: r.clientId,
        type: 'Dépannage',
        name: r.description || 'Dépannage',
        clientName: clients.find((c) => c.id === r.clientId)?.name || 'Inconnu',
        status: 'termine',
        amount: r.amount,
        date: r.date,
      });
    });

    instantRequests.forEach((r) => {
      if (!existingClientIds.has(r.clientId)) return;
      items.push({
        id: r.id,
        clientId: r.clientId,
        type: 'Intervention instantanée',
        name: r.address || r.description || 'Intervention',
        clientName: clients.find((c) => c.id === r.clientId)?.name || 'Inconnu',
        status: r.status,
        amount: r.clientProposedAmount || 0,
        date: r.createdAt,
      });
    });

    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [projects, manualRevenues, instantRequests, clients]);

  const filteredCommandes = useMemo(() => {
    const { start, end } = getDateRange;
    let list = allCommandes.filter((c) => {
      const d = c.date;
      return d >= start && d <= end;
    });
    if (!includeExpiredCancelled) {
      list = list.filter((c) => c.status !== 'expire' && c.status !== 'annule');
    }
    if (filterType !== 'all') {
      list = list.filter((c) => c.type === filterType);
    }
    if (filterStatus !== 'all') {
      list = list.filter((c) => c.status === filterStatus);
    }
    return list;
  }, [allCommandes, filterType, filterStatus, includeExpiredCancelled, getDateRange]);

  const stats = useMemo(() => {
    const { start, end } = getDateRange;
    const inRange = allCommandes.filter((c) => {
      const d = c.date;
      return d >= start && d <= end;
    });
    const active = inRange.filter((c) => c.status !== 'expire' && c.status !== 'annule');
    const byType = {
      Projet: active.filter((c) => c.type === 'Projet').length,
      Dépannage: active.filter((c) => c.type === 'Dépannage').length,
      'Intervention instantanée': active.filter((c) => c.type === 'Intervention instantanée').length,
    };
    const totalAmount = active.reduce((s, c) => s + c.amount, 0);
    const byStatus = {
      en_attente: active.filter((c) => c.status === 'en_attente').length,
      accepte: active.filter((c) => c.status === 'accepte').length,
      en_cours: active.filter((c) => c.status === 'en_cours').length,
      termine: active.filter((c) => c.status === 'termine').length,
    };
    return { total: active.length, byType, totalAmount, byStatus };
  }, [allCommandes, getDateRange]);

  const formatPeriodLabel = () => {
    const { start, end } = getDateRange;
    const formatDateShort = (date: Date) => date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    if (datePreset === 'custom') return `${formatDateShort(start)} - ${formatDateShort(end)}`;
    const presetLabels: Record<DatePreset, string> = {
      today: "Aujourd'hui",
      yesterday: 'Hier',
      last7days: '7 derniers jours',
      last30days: '30 derniers jours',
      thisMonth: 'Ce mois',
      lastMonth: 'Mois dernier',
      thisYear: 'Cette année',
      lastYear: 'Année dernière',
      custom: '',
    };
    return presetLabels[datePreset] || formatDateShort(start);
  };

  const handleDelete = async (cmd: CommandeItem) => {
    const label = `${cmd.type}: ${cmd.name}`;
    if (!confirm(`Supprimer définitivement cette commande ?\n\n${label}\n\nCette action est irréversible.`)) return;
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      alert('Session expirée. Veuillez vous reconnecter.');
      return;
    }
    setDeletingId(cmd.id);
    try {
      const typeParam =
        cmd.type === 'Projet' ? 'project' :
        cmd.type === 'Dépannage' ? 'depannage' : 'instant';
      const res = await fetch(`/api/commandes/${cmd.id}?type=${typeParam}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la suppression');
      await loadData();
    } catch (error) {
      console.error('Error deleting commande:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      termine: 'bg-green-100 text-green-700',
      accepte: 'bg-blue-100 text-blue-700',
      en_attente: 'bg-yellow-100 text-yellow-700',
      en_cours: 'bg-blue-100 text-blue-700',
      expire: 'bg-gray-100 text-gray-600',
      annule: 'bg-gray-100 text-gray-600',
    };
    const labels: Record<string, string> = {
      termine: 'Terminé',
      accepte: 'Accepté',
      en_attente: 'En attente',
      en_cours: 'En cours',
      expire: 'Expiré',
      annule: 'Annulé',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${classes[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Commandes</h1>
            <p className="text-sm text-gray-600 mt-1">Vue détaillée des projets, dépannages et interventions instantanées</p>
          </div>
          {/* Sélecteur de dates */}
          <div className="relative date-picker-container w-full sm:w-auto">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="btn btn-secondary flex items-center space-x-2 text-sm w-full sm:w-auto justify-center"
            >
              <Calendar size={16} />
              <span className="truncate">{formatPeriodLabel()}</span>
              <ChevronDown size={14} />
            </button>
            {showDatePicker && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 min-w-[280px] sm:min-w-[320px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Période</h3>
                  <button onClick={() => setShowDatePicker(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-2 mb-4">
                  {(['today', 'yesterday', 'last7days', 'last30days', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear'] as DatePreset[]).map((preset) => {
                    const labels: Record<DatePreset, string> = {
                      today: "Aujourd'hui",
                      yesterday: 'Hier',
                      last7days: '7 derniers jours',
                      last30days: '30 derniers jours',
                      thisMonth: 'Ce mois',
                      lastMonth: 'Mois dernier',
                      thisYear: 'Cette année',
                      lastYear: 'Année dernière',
                      custom: 'Personnalisé',
                    };
                    return (
                      <button
                        key={preset}
                        onClick={() => {
                          setDatePreset(preset);
                          if (preset !== 'custom') setShowDatePicker(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                          datePreset === preset ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {labels[preset]}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => {
                      setDatePreset('custom');
                      if (!customStartDate || !customEndDate) {
                        const today = new Date();
                        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                        setCustomStartDate(lastMonth.toISOString().split('T')[0]);
                        setCustomEndDate(today.toISOString().split('T')[0]);
                      }
                    }}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                      datePreset === 'custom' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    Période personnalisée
                  </button>
                </div>
                {datePreset === 'custom' && (
                  <div className="space-y-3 pt-3 border-t border-gray-200">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Date début</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="input text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Date fin</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="input text-sm"
                      />
                    </div>
                    <button
                      onClick={() => customStartDate && customEndDate && setShowDatePicker(false)}
                      className="btn btn-primary w-full text-sm"
                    >
                      Appliquer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card bg-primary-50 border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total commandes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <ShoppingCart className="w-10 h-10 text-primary-600" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Montant total</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Projets</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.byType.Projet}</p>
              </div>
              <FolderKanban className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Dépannages</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.byType.Dépannage}</p>
              </div>
              <Wrench className="w-10 h-10 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600 mb-2">Interventions instantanées</p>
            <p className="text-2xl font-bold text-gray-900">{stats.byType['Intervention instantanée']}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 mb-2">Par statut</p>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="text-sm">En attente: <strong>{stats.byStatus.en_attente}</strong></span>
              <span className="text-sm">Accepté: <strong>{stats.byStatus.accepte}</strong></span>
              <span className="text-sm">En cours: <strong>{stats.byStatus.en_cours}</strong></span>
              <span className="text-sm">Terminé: <strong>{stats.byStatus.termine}</strong></span>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="card">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input py-2 text-sm"
              >
                <option value="all">Tous</option>
                <option value="Projet">Projets</option>
                <option value="Dépannage">Dépannages</option>
                <option value="Intervention instantanée">Interventions instantanées</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input py-2 text-sm"
              >
                <option value="all">Tous</option>
                <option value="en_attente">En attente</option>
                <option value="accepte">Accepté</option>
                <option value="en_cours">En cours</option>
                <option value="termine">Terminé</option>
                {includeExpiredCancelled && (
                  <>
                    <option value="expire">Expiré</option>
                    <option value="annule">Annulé</option>
                  </>
                )}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="includeExpired"
                checked={includeExpiredCancelled}
                onChange={(e) => setIncludeExpiredCancelled(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="includeExpired" className="text-sm text-gray-700">
                Inclure expirées et annulées
              </label>
            </div>
          </div>
        </div>

        {/* Tableau des commandes */}
        <div className="card overflow-hidden">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Liste des commandes ({filteredCommandes.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase">Client</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase">Nom</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase">Statut</th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-600 uppercase">Montant</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-600 uppercase w-12">Suppr.</th>
                </tr>
              </thead>
              <tbody>
                {filteredCommandes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      Aucune commande
                    </td>
                  </tr>
                ) : (
                  filteredCommandes.map((cmd) => (
                    <tr key={`${cmd.type}-${cmd.id}`} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <Link href={`/clients/${cmd.clientId}`} className="text-primary-600 hover:underline font-medium">
                          {cmd.clientName}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {cmd.type === 'Projet' ? (
                          <Link href={`/projets/${cmd.id}`} className="text-primary-600 hover:underline">
                            {cmd.name}
                          </Link>
                        ) : cmd.type === 'Dépannage' ? (
                          <Link href={`/clients/${cmd.clientId}`} className="text-primary-600 hover:underline">
                            {cmd.name}
                          </Link>
                        ) : (
                          cmd.name
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{cmd.type}</td>
                      <td className="py-3 px-4">{getStatusBadge(cmd.status)}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(cmd.amount)}</td>
                      <td className="py-3 px-4 text-gray-500">{formatDate(cmd.date)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDelete(cmd)}
                          disabled={deletingId === cmd.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Supprimer définitivement"
                        >
                          {deletingId === cmd.id ? (
                            <span className="inline-block w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
