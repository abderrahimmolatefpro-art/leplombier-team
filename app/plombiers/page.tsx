'use client';

import { useEffect, useState, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { generatePassword } from '@/lib/auth-utils';
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
  Edit,
  Plus,
  Trash2,
  BadgeCheck,
  Check,
  XCircle
} from 'lucide-react';
import type { PlombierValidationStatus } from '@/types';
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
  unpaid: number; // Montant non payé à la société
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    phone: '',
    password: '',
  });
  const [creating, setCreating] = useState(false);

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
        hasInvoice: doc.data().hasInvoice || false,
        paidByPlombierIds: doc.data().paidByPlombierIds || [],
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
      const revenuesData = revenuesSnapshot.docs
        .filter((doc) => !doc.data().deleted)
        .map((doc) => ({
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

      // Calculer les revenus avec pourcentages personnalisés
      let totalPlombierShare = 0;
      let totalCompanyShare = 0;
      let unpaidAmount = 0;
      
      // Revenus des projets (avec pourcentage personnalisé)
      plombierProjects.forEach(project => {
        if (project.amount && project.amount > 0) {
          const plombierPercent = (project.plombierPercentage || 60) / 100;
          const companyPercent = 1 - plombierPercent;
          const sharePerPlombier = project.amount / (project.plombierIds?.length || 1);
          const plombierSharePerPlombier = sharePerPlombier * plombierPercent;
          const companySharePerPlombier = sharePerPlombier * companyPercent;
          
          totalRevenue += sharePerPlombier;
          totalPlombierShare += plombierSharePerPlombier;
          totalCompanyShare += companySharePerPlombier;
          
          // Calculer le montant non payé
          const hasPaid = project.paidByPlombierIds?.includes(plombier.id) || false;
          if (!hasPaid) {
            unpaidAmount += companySharePerPlombier;
          }
        }
      });

      // Revenus des factures (utiliser pourcentage du projet lié ou 60% par défaut)
      plombierInvoices.forEach(invoice => {
        const relatedProject = plombierProjects.find(p => p.clientId === invoice.clientId);
        const plombierPercent = relatedProject ? (relatedProject.plombierPercentage || 60) / 100 : 0.6;
        const companyPercent = 1 - plombierPercent;
        const invoiceAmount = invoice.total || 0;
        
        totalRevenue += invoiceAmount;
        totalPlombierShare += invoiceAmount * plombierPercent;
        totalCompanyShare += invoiceAmount * companyPercent;
        
        // Calculer le montant non payé
        if (!relatedProject || !relatedProject.paidByPlombierIds?.includes(plombier.id)) {
          unpaidAmount += invoiceAmount * companyPercent;
        }
      });

      // Revenus des dépannages (avec pourcentage personnalisé)
      plombierDepannages.forEach(depannage => {
        const plombierPercent = (depannage.plombierPercentage || 60) / 100;
        const companyPercent = 1 - plombierPercent;
        
        totalRevenue += depannage.amount;
        totalPlombierShare += depannage.amount * plombierPercent;
        totalCompanyShare += depannage.amount * companyPercent;
        
        // Calculer le montant non payé
        if (!depannage.plombierHasPaid) {
          unpaidAmount += depannage.amount * companyPercent;
        }
      });

      const plombierShare = totalPlombierShare;
      const companyShare = totalCompanyShare;

      stats.push({
        plombier,
        totalRevenue,
        plombierShare,
        companyShare,
        unpaid: Math.round(unpaidAmount),
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

  // Calcul des totaux
  const totals = useMemo(() => {
    return plombierStats.reduce((acc, stat) => {
      acc.totalRevenue += stat.totalRevenue;
      acc.totalPlombierShare += stat.plombierShare;
      acc.totalCompanyShare += stat.companyShare;
      acc.totalUnpaid += (stat.unpaid || 0);
      acc.totalProjects += stat.totalProjects;
      acc.totalCompletedProjects += stat.completedProjects;
      acc.totalActiveProjects += stat.activeProjects;
      return acc;
    }, {
      totalRevenue: 0,
      totalPlombierShare: 0,
      totalCompanyShare: 0,
      totalUnpaid: 0,
      totalProjects: 0,
      totalCompletedProjects: 0,
      totalActiveProjects: 0,
    });
  }, [plombierStats]);

  const toggleExpand = (plombierId: string) => {
    const newExpanded = new Set(expandedPlombiers);
    if (newExpanded.has(plombierId)) {
      newExpanded.delete(plombierId);
    } else {
      newExpanded.add(plombierId);
    }
    setExpandedPlombiers(newExpanded);
  };

  const handleToggleProjectPayment = async (projectId: string, plombierId: string) => {
    if (!user) return;
    
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;
      
      const currentPaidIds = project.paidByPlombierIds || [];
      const hasPaid = currentPaidIds.includes(plombierId);
      
      const newPaidIds = hasPaid
        ? currentPaidIds.filter(id => id !== plombierId)
        : [...currentPaidIds, plombierId];
      
      await updateDoc(doc(db, 'projects', projectId), {
        paidByPlombierIds: newPaidIds,
        updatedAt: Timestamp.now(),
      });
      
      loadData();
    } catch (error) {
      console.error('Error updating project payment status:', error);
      alert('Erreur lors de la mise à jour du statut de paiement');
    }
  };

  const handleToggleDepannagePayment = async (depannageId: string) => {
    if (!user) return;
    
    try {
      const depannage = manualRevenues.find(r => r.id === depannageId);
      if (!depannage) return;
      
      const newHasPaid = !depannage.plombierHasPaid;
      
      await updateDoc(doc(db, 'manualRevenues', depannageId), {
        plombierHasPaid: newHasPaid,
        updatedAt: Timestamp.now(),
      });
      
      loadData();
    } catch (error) {
      console.error('Error updating depannage payment status:', error);
      alert('Erreur lors de la mise à jour du statut de paiement');
    }
  };

  const handleCreatePlombier = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      alert('Session expirée. Veuillez vous reconnecter.');
      setCreating(false);
      return;
    }
    try {
      const res = await fetch('/api/plombiers/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: createFormData.name,
          phone: createFormData.phone,
          password: createFormData.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la création');

      setShowCreateModal(false);
      setCreateFormData({ name: '', phone: '', password: '' });
      loadData();
      alert('Plombier créé avec succès ! Communiquez le mot de passe au plombier.');
    } catch (error: any) {
      console.error('Error creating plombier:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const getValidationBadge = (status?: PlombierValidationStatus) => {
    const config: Record<string, { label: string; className: string }> = {
      pending_documents: { label: 'En attente documents', className: 'bg-amber-100 text-amber-700' },
      documents_submitted: { label: 'Documents soumis', className: 'bg-blue-100 text-blue-700' },
      validated: { label: 'Validé', className: 'bg-green-100 text-green-700' },
      rejected: { label: 'Rejeté', className: 'bg-red-100 text-red-700' },
    };
    const c = status ? config[status] : null;
    if (!c) return null;
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${c.className}`}>
        {c.label}
      </span>
    );
  };

  const handleValidatePlombier = async (plombierId: string) => {
    try {
      await updateDoc(doc(db, 'users', plombierId), {
        validationStatus: 'validated',
        validatedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la validation');
    }
  };

  const handleRejectPlombier = async (plombierId: string) => {
    if (!confirm('Rejeter ce plombier ?')) return;
    try {
      await updateDoc(doc(db, 'users', plombierId), {
        validationStatus: 'rejected',
        updatedAt: Timestamp.now(),
      });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Erreur lors du rejet');
    }
  };

  const handleDeletePlombier = async (plombierId: string, plombierName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${plombierName} ? Cette action est irréversible.`)) {
      return;
    }

    try {
      // Supprimer le document Firestore
      await deleteDoc(doc(db, 'users', plombierId));
      
      // Note: La suppression de l'utilisateur Firebase Auth nécessite des privilèges admin
      // On supprime seulement le document Firestore pour l'instant
      
      loadData();
      alert('Plombier supprimé avec succès !');
    } catch (error: any) {
      console.error('Error deleting plombier:', error);
      if (error.code === 'permission-denied') {
        alert('Erreur de permissions. Vous devez être admin pour supprimer un plombier.');
      } else {
        alert(`Erreur lors de la suppression: ${error.message || 'Erreur inconnue'}`);
      }
    }
  };

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
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Ajouter un plombier</span>
          </button>
        </div>

        {/* Filtres */}
        <div className="card mb-4 sm:mb-6 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
            {/* Filtre plombier */}
            <div className="flex-1 min-w-0 sm:min-w-[200px]">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
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
            <div className="flex-1 min-w-0 sm:min-w-[200px] relative date-picker-container">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
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

        {/* Totaux généraux */}
        {plombierStats.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Totaux généraux</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-primary-50 p-4 rounded-lg">
                <p className="text-sm text-primary-700 font-medium">Revenus totaux</p>
                <p className="text-2xl font-bold text-primary-900 mt-1">
                  {formatCurrency(totals.totalRevenue)}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-700 font-medium">Part plombiers</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {formatCurrency(totals.totalPlombierShare)}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">Part société</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {formatCurrency(totals.totalCompanyShare)}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-orange-700 font-medium">Non payé</p>
                <p className="text-2xl font-bold text-orange-900 mt-1">
                  {formatCurrency(totals.totalUnpaid)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 font-medium">Projets</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {totals.totalProjects}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {totals.totalCompletedProjects} terminés • {totals.totalActiveProjects} en cours
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tableau récapitulatif */}
        {plombierStats.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Récapitulatif par plombier</h2>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-2 sm:px-0">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Plombier</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenus totaux</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Part plombier</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Part société</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Non payé</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Projets</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                <tbody>
                  {plombierStats.map((stat) => (
                    <Fragment key={`fragment-${stat.plombier.id}`}>
                      <tr 
                        key={stat.plombier.id}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleExpand(stat.plombier.id)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Users className="text-primary-600" size={16} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-gray-900">{stat.plombier.name}</p>
                                {stat.plombier.certified && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700" title="Certifié leplombier.ma">
                                    <BadgeCheck className="w-3 h-3" />
                                    Certifié
                                  </span>
                                )}
                                {getValidationBadge(stat.plombier.validationStatus)}
                              </div>
                              <p className="text-xs text-gray-500">{stat.plombier.phone || stat.plombier.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 font-semibold text-gray-900">
                          {formatCurrency(stat.totalRevenue)}
                        </td>
                        <td className="text-right py-3 px-4 text-green-700 font-medium">
                          {formatCurrency(stat.plombierShare)}
                        </td>
                        <td className="text-right py-3 px-4 text-blue-700 font-medium">
                          {formatCurrency(stat.companyShare)}
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className={`font-medium text-xs sm:text-sm ${
                            stat.unpaid > 0 ? 'text-orange-600' : 'text-gray-500'
                          }`}>
                            {formatCurrency(stat.unpaid)}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className="font-medium text-gray-900">{stat.totalProjects}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({stat.completedProjects}✓ {stat.activeProjects}→)
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <div className="flex items-center justify-center space-x-2 flex-wrap gap-1">
                            {stat.plombier.validationStatus === 'documents_submitted' && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleValidatePlombier(stat.plombier.id);
                                  }}
                                  className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                                  title="Valider"
                                >
                                  <Check size={18} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRejectPlombier(stat.plombier.id);
                                  }}
                                  className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                                  title="Rejeter"
                                >
                                  <XCircle size={18} />
                                </button>
                              </>
                            )}
                            <Link
                              href={`/plombiers/${stat.plombier.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded"
                              title="Modifier"
                            >
                              <Edit size={18} />
                            </Link>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePlombier(stat.plombier.id, stat.plombier.name);
                              }}
                              className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Supprimer"
                            >
                              <Trash2 size={18} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(stat.plombier.id);
                              }}
                              className="p-1 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded"
                            >
                              <ChevronRight 
                                size={18} 
                                className={`transition-transform ${expandedPlombiers.has(stat.plombier.id) ? 'rotate-90' : ''}`}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedPlombiers.has(stat.plombier.id) && (
                        <tr>
                          <td colSpan={6} className="p-4 bg-gray-50">
                            {/* Tableau compact des prestations */}
                            <div className="space-y-3">
                              {/* Projets - une ligne par projet */}
                              {stat.projects.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Projets ({stat.projects.length})</h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-gray-200">
                                          <th className="text-left py-2 px-3 font-medium text-gray-700">Titre</th>
                                          <th className="text-left py-2 px-3 font-medium text-gray-700">Date</th>
                                          <th className="text-right py-2 px-3 font-medium text-gray-700">Montant</th>
                                          <th className="text-center py-2 px-3 font-medium text-gray-700">Statut</th>
                                          <th className="text-center py-2 px-3 font-medium text-gray-700">Paiement</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {stat.projects.map(project => {
                                          const hasPaid = project.paidByPlombierIds?.includes(stat.plombier.id) || false;
                                          const plombierPercent = (project.plombierPercentage || 60) / 100;
                                          const companyPercent = 1 - plombierPercent;
                                          const plombierShare = project.amount && project.plombierIds.length > 0
                                            ? (project.amount * plombierPercent) / project.plombierIds.length
                                            : 0;
                                          const companyShare = project.amount && project.plombierIds.length > 0
                                            ? (project.amount * companyPercent) / project.plombierIds.length
                                            : 0;
                                          
                                          return (
                                            <tr key={project.id} className="border-b border-gray-100 hover:bg-white">
                                              <td className="py-2 px-3 font-medium text-gray-900">{project.title}</td>
                                              <td className="py-2 px-3 text-gray-600">{formatDate(project.startDate)}</td>
                                              <td className="py-2 px-3 text-right font-medium text-gray-900">
                                                {formatCurrency(project.amount || 0)}
                                                {project.plombierIds.length > 1 && (
                                                  <span className="text-xs text-gray-500 block">
                                                    Part: {formatCurrency(plombierShare)}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-2 px-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                  project.status === 'termine' ? 'bg-green-100 text-green-700' :
                                                  project.status === 'en_cours' ? 'bg-blue-100 text-blue-700' :
                                                  'bg-gray-100 text-gray-700'
                                                }`}>
                                                  {project.status === 'termine' ? 'Terminé' :
                                                   project.status === 'en_cours' ? 'En cours' :
                                                   project.status === 'en_attente' ? 'En attente' : project.status}
                                                </span>
                                              </td>
                                              <td className="py-2 px-3 text-center">
                                                <button
                                                  onClick={() => handleToggleProjectPayment(project.id, stat.plombier.id)}
                                                  className={`px-2 py-1 text-xs rounded flex items-center gap-1 mx-auto ${
                                                    hasPaid
                                                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                  }`}
                                                  title={`${hasPaid ? 'Marquer comme non payé' : 'Marquer comme payé'}: ${formatCurrency(companyShare)}`}
                                                >
                                                  <span>{hasPaid ? '✓ Payé' : '○ Non payé'}</span>
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Factures - une ligne par facture */}
                              {stat.invoices.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Factures ({stat.invoices.length})</h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-gray-200">
                                          <th className="text-left py-2 px-3 font-medium text-gray-700">Numéro</th>
                                          <th className="text-left py-2 px-3 font-medium text-gray-700">Date</th>
                                          <th className="text-right py-2 px-3 font-medium text-gray-700">Montant</th>
                                          <th className="text-center py-2 px-3 font-medium text-gray-700">Statut</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {stat.invoices.map(invoice => (
                                          <tr key={invoice.id} className="border-b border-gray-100 hover:bg-white">
                                            <td className="py-2 px-3 font-medium text-gray-900">Facture {invoice.number}</td>
                                            <td className="py-2 px-3 text-gray-600">{formatDate(invoice.date)}</td>
                                            <td className="py-2 px-3 text-right font-medium text-gray-900">{formatCurrency(invoice.total || 0)}</td>
                                            <td className="py-2 px-3 text-center">
                                              <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                                                Payée
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Dépannages - une ligne par dépannage */}
                              {stat.depannages.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Dépannages ({stat.depannages.length})</h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-gray-200">
                                          <th className="text-left py-2 px-3 font-medium text-gray-700">Description</th>
                                          <th className="text-left py-2 px-3 font-medium text-gray-700">Date</th>
                                          <th className="text-right py-2 px-3 font-medium text-gray-700">Montant</th>
                                          <th className="text-center py-2 px-3 font-medium text-gray-700">Type</th>
                                          <th className="text-center py-2 px-3 font-medium text-gray-700">Paiement</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {stat.depannages.map(depannage => {
                                          const plombierPercent = (depannage.plombierPercentage || 60) / 100;
                                          const companyPercent = 1 - plombierPercent;
                                          const plombierShare = depannage.amount * plombierPercent;
                                          const companyShare = depannage.amount * companyPercent;
                                          
                                          return (
                                            <tr key={depannage.id} className="border-b border-gray-100 hover:bg-white">
                                              <td className="py-2 px-3 font-medium text-gray-900">{depannage.description || 'Dépannage'}</td>
                                              <td className="py-2 px-3 text-gray-600">{formatDate(depannage.date)}</td>
                                              <td className="py-2 px-3 text-right font-medium text-gray-900">
                                                {formatCurrency(depannage.amount)}
                                                <span className="text-xs text-gray-500 block">
                                                  Part plombier: {formatCurrency(plombierShare)} | Part société: {formatCurrency(companyShare)}
                                                </span>
                                              </td>
                                              <td className="py-2 px-3 text-center">
                                                {depannage.isBlackRevenue && (
                                                  <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
                                                    Sans facture
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-2 px-3 text-center">
                                                <button
                                                  onClick={() => handleToggleDepannagePayment(depannage.id)}
                                                  className={`px-2 py-1 text-xs rounded flex items-center gap-1 mx-auto ${
                                                    depannage.plombierHasPaid
                                                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                  }`}
                                                  title={`${depannage.plombierHasPaid ? 'Marquer comme non payé' : 'Marquer comme payé'}: ${formatCurrency(companyShare)}`}
                                                >
                                                  <span>{depannage.plombierHasPaid ? '✓ Payé' : '○ Non payé'}</span>
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Message si aucune prestation */}
                              {stat.projects.length === 0 && stat.invoices.length === 0 && stat.depannages.length === 0 && (
                                <div className="text-center py-4 text-gray-500 text-sm">
                                  Aucune prestation pour cette période
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {plombierStats.length === 0 && (
          <div className="card text-center py-12">
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">Aucun plombier trouvé</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary mt-4"
            >
              Ajouter un plombier
            </button>
          </div>
        )}

        {/* Modal de création */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Ajouter un plombier</h2>
                
                <form onSubmit={handleCreatePlombier} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom complet *
                    </label>
                    <input
                      type="text"
                      required
                      value={createFormData.name}
                      onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                      className="input"
                      placeholder="Nom du plombier"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={createFormData.phone}
                      onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                      className="input"
                      placeholder="06 12 34 56 78"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mot de passe *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={createFormData.password}
                        onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                        className="input flex-1"
                        placeholder="Minimum 6 caractères"
                      />
                      <button
                        type="button"
                        onClick={() => setCreateFormData({ ...createFormData, password: generatePassword() })}
                        className="btn btn-secondary whitespace-nowrap"
                      >
                        Générer
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setCreateFormData({ name: '', phone: '', password: '' });
                      }}
                      className="btn btn-secondary"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={creating}
                    >
                      {creating ? 'Création...' : 'Créer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
