'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, Client, Document, ManualRevenue, User } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { 
  Users, 
  DollarSign, 
  Calendar,
  Filter,
  ChevronDown,
  X,
  ChevronRight,
  Edit
} from 'lucide-react';
import Link from 'next/link';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
  subYears,
  format
} from 'date-fns';
import { fr } from 'date-fns/locale';

type DatePreset = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom';

interface DateRange {
  start: Date;
  end: Date;
}

interface PlombierStats {
  plombier: User;
  totalRevenue: number;
  plombierShare: number; // 60% du total
  companyShare: number; // 40% du total
  projects: Project[];
  invoices: Document[];
  depannages: ManualRevenue[];
  totalProjects: number;
  completedProjects: number;
  activeProjects: number;
}

export default function PlombiersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plombiers, setPlombiers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [manualRevenues, setManualRevenues] = useState<ManualRevenue[]>([]);
  
  // Filtres de date
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPlombierId, setSelectedPlombierId] = useState<string>('all');
  const [expandedPlombiers, setExpandedPlombiers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadData();
    }
  }, [user, authLoading, router]);

  // Fermer le sélecteur de dates quand on clique en dehors
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

  const loadData = async () => {
    try {
      // Charger les plombiers
      const plombiersQuery = query(collection(db, 'users'), where('role', '==', 'plombier'));
      const plombiersSnapshot = await getDocs(plombiersQuery);
      const plombiersData = plombiersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as User[];
      setPlombiers(plombiersData);

      // Charger les projets
      const projectsQuery = query(collection(db, 'projects'));
      const projectsSnapshot = await getDocs(projectsQuery);
      const projectsData = projectsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate() || new Date(),
        endDate: doc.data().endDate?.toDate(),
        amount: doc.data().amount || 0,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Project[];
      setProjects(projectsData);

      // Charger les clients
      const clientsQuery = query(collection(db, 'clients'));
      const clientsSnapshot = await getDocs(clientsQuery);
      const clientsData = clientsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Client[];
      setClients(clientsData);

      // Charger les documents (factures payées)
      const documentsQuery = query(collection(db, 'documents'));
      const documentsSnapshot = await getDocs(documentsQuery);
      const documentsData = documentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        dueDate: doc.data().dueDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Document[];
      setDocuments(documentsData);

      // Charger les revenus manuels (dépannages)
      const revenuesQuery = query(collection(db, 'manualRevenues'));
      const revenuesSnapshot = await getDocs(revenuesQuery);
      const revenuesData = revenuesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as ManualRevenue[];
      setManualRevenues(revenuesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calcul des plages de dates selon le preset
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
          start = startOfMonth(today);
          end = endOfMonth(today);
          break;
        case 'lastMonth':
          const lastMonth = subMonths(today, 1);
          start = startOfMonth(lastMonth);
          end = endOfMonth(lastMonth);
          break;
        case 'thisYear':
          start = startOfYear(today);
          end = endOfYear(today);
          break;
        case 'lastYear':
          const lastYear = subYears(today, 1);
          start = startOfYear(lastYear);
          end = endOfYear(lastYear);
          break;
        default:
          start = startOfMonth(today);
          end = endOfMonth(today);
      }
    }

    return { start, end };
  }, [datePreset, customStartDate, customEndDate]);

  // Statistiques par plombier
  const plombierStats = useMemo(() => {
    const { start, end } = getDateRange;
    const existingClientIds = new Set(clients.map(c => c.id));
    const stats: PlombierStats[] = [];

    // Filtrer les données par période et clients existants
    const filteredProjects = projects.filter(p => {
      const projectDate = p.createdAt || p.startDate;
      return projectDate >= start && projectDate <= end && existingClientIds.has(p.clientId);
    });

    const filteredInvoices = documents.filter(d => {
      return d.type === 'facture' && 
             d.status === 'paye' && 
             d.date >= start && 
             d.date <= end && 
             existingClientIds.has(d.clientId);
    });

    const filteredDepannages = manualRevenues.filter(r => {
      return r.date >= start && r.date <= end && existingClientIds.has(r.clientId);
    });

    plombiers.forEach(plombier => {
      // Projets assignés à ce plombier
      const plombierProjects = filteredProjects.filter(p => 
        p.plombierIds && p.plombierIds.includes(plombier.id)
      );

      // Factures des clients assignés à ce plombier
      const plombierInvoices = filteredInvoices.filter(invoice => {
        const client = clients.find(c => c.id === invoice.clientId);
        return client?.assignedPlombierId === plombier.id;
      });

      // Dépannages assignés à ce plombier
      const plombierDepannages = filteredDepannages.filter(d => 
        d.plombierId === plombier.id
      );

      // Calcul des revenus
      let totalRevenue = 0;

      // Revenus des projets (montant total du projet)
      plombierProjects.forEach(project => {
        if (project.amount && project.amount > 0) {
          // Répartition équitable entre les plombiers du projet
          const share = project.amount / (project.plombierIds?.length || 1);
          totalRevenue += share;
        }
      });

      // Revenus des factures
      plombierInvoices.forEach(invoice => {
        totalRevenue += invoice.total || 0;
      });

      // Revenus des dépannages
      plombierDepannages.forEach(depannage => {
        totalRevenue += depannage.amount;
      });

      const plombierShare = totalRevenue * 0.6; // 60%
      const companyShare = totalRevenue * 0.4; // 40%

      stats.push({
        plombier,
        totalRevenue,
        plombierShare,
        companyShare,
        projects: plombierProjects,
        invoices: plombierInvoices,
        depannages: plombierDepannages,
        totalProjects: plombierProjects.length,
        completedProjects: plombierProjects.filter(p => p.status === 'termine').length,
        activeProjects: plombierProjects.filter(p => p.status === 'en_cours').length,
      });
    });

    // Filtrer par plombier sélectionné
    if (selectedPlombierId !== 'all') {
      return stats.filter(s => s.plombier.id === selectedPlombierId);
    }

    return stats.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [plombiers, projects, clients, documents, manualRevenues, getDateRange, selectedPlombierId]);

  const getPresetLabel = () => {
    switch (datePreset) {
      case 'today': return "Aujourd'hui";
      case 'yesterday': return 'Hier';
      case 'last7days': return '7 derniers jours';
      case 'last30days': return '30 derniers jours';
      case 'thisMonth': return 'Ce mois';
      case 'lastMonth': return 'Mois dernier';
      case 'thisYear': return 'Cette année';
      case 'lastYear': return 'Année dernière';
      case 'custom': return 'Personnalisé';
      default: return 'Ce mois';
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Prestations par plombier</h1>
            <p className="text-gray-600 mt-2">Détail des prestations et revenus par plombier</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="card mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Filtre plombier */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plombier
              </label>
              <select
                value={selectedPlombierId}
                onChange={(e) => setSelectedPlombierId(e.target.value)}
                className="input"
              >
                <option value="all">Tous les plombiers</option>
                {plombiers.map(plombier => (
                  <option key={plombier.id} value={plombier.id}>
                    {plombier.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre date */}
            <div className="flex-1 min-w-[200px] relative date-picker-container">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Période
              </label>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="input flex items-center justify-between w-full"
              >
                <span>{getPresetLabel()}</span>
                <ChevronDown size={20} className="text-gray-400" />
              </button>

              {showDatePicker && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4 min-w-[300px]">
                  <div className="space-y-2">
                    {(['today', 'yesterday', 'last7days', 'last30days', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear'] as DatePreset[]).map(preset => (
                      <button
                        key={preset}
                        onClick={() => {
                          setDatePreset(preset);
                          setShowDatePicker(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                          datePreset === preset ? 'bg-primary-50 text-primary-700' : ''
                        }`}
                      >
                        {preset === 'today' && "Aujourd'hui"}
                        {preset === 'yesterday' && 'Hier'}
                        {preset === 'last7days' && '7 derniers jours'}
                        {preset === 'last30days' && '30 derniers jours'}
                        {preset === 'thisMonth' && 'Ce mois'}
                        {preset === 'lastMonth' && 'Mois dernier'}
                        {preset === 'thisYear' && 'Cette année'}
                        {preset === 'lastYear' && 'Année dernière'}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setDatePreset('custom');
                        setShowDatePicker(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                        datePreset === 'custom' ? 'bg-primary-50 text-primary-700' : ''
                      }`}
                    >
                      Personnalisé
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Dates personnalisées */}
            {datePreset === 'custom' && (
              <>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date début
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date fin
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="input"
                  />
                </div>
              </>
            )}
          </div>

          {/* Affichage de la période */}
          <div className="mt-4 text-sm text-gray-600">
            Période : {format(getDateRange.start, 'dd MMM yyyy', { locale: fr })} - {format(getDateRange.end, 'dd MMM yyyy', { locale: fr })}
          </div>
        </div>

        {/* Liste des plombiers */}
        <div className="space-y-6">
          {plombierStats.map((stat) => (
            <div key={stat.plombier.id} className="card">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <Users className="text-primary-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{stat.plombier.name}</h2>
                    <p className="text-sm text-gray-600">{stat.plombier.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Revenus totaux</p>
                  <p className="text-3xl font-bold text-primary-600">
                    {formatCurrency(stat.totalRevenue)}
                  </p>
                </div>
              </div>

              {/* Statistiques financières */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">Part plombier (60%)</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {formatCurrency(stat.plombierShare)}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium">Part société (40%)</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {formatCurrency(stat.companyShare)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 font-medium">Projets</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stat.totalProjects}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {stat.completedProjects} terminés • {stat.activeProjects} en cours
                  </p>
                </div>
              </div>

              {/* Détail des prestations */}
              <div className="space-y-4">
                {/* Projets */}
                {stat.projects.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Projets ({stat.projects.length})</h3>
                    <div className="space-y-2">
                      {stat.projects.map(project => (
                        <div key={project.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{project.title}</p>
                              <p className="text-sm text-gray-600">
                                {formatDate(project.startDate)} • {formatCurrency(project.amount || 0)}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              project.status === 'termine' ? 'bg-green-100 text-green-700' :
                              project.status === 'en_cours' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {project.status === 'termine' ? 'Terminé' :
                               project.status === 'en_cours' ? 'En cours' :
                               project.status === 'en_attente' ? 'En attente' : project.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Factures */}
                {stat.invoices.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Factures ({stat.invoices.length})</h3>
                    <div className="space-y-2">
                      {stat.invoices.map(invoice => (
                        <div key={invoice.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">Facture {invoice.number}</p>
                              <p className="text-sm text-gray-600">
                                {formatDate(invoice.date)} • {formatCurrency(invoice.total || 0)}
                              </p>
                            </div>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                              Payée
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dépannages */}
                {stat.depannages.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Dépannages ({stat.depannages.length})</h3>
                    <div className="space-y-2">
                      {stat.depannages.map(depannage => (
                        <div key={depannage.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{formatCurrency(depannage.amount)}</p>
                              <p className="text-sm text-gray-600">
                                {formatDate(depannage.date)} • {depannage.description || 'Dépannage'}
                              </p>
                            </div>
                            {depannage.isBlackRevenue && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-gray-800 text-white">
                                En noir
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message si aucune prestation */}
                {stat.projects.length === 0 && stat.invoices.length === 0 && stat.depannages.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Aucune prestation pour cette période
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>
        )}

        {plombierStats.length === 0 && (
          <div className="card text-center py-12">
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">Aucun plombier trouvé</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
