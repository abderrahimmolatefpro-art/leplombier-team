'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, Client, Document, ManualRevenue, User } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { 
  FolderKanban, 
  Users, 
  FileText, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  ChevronDown,
  X,
  Edit
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import Link from 'next/link';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

type DatePreset = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom';
type ComparisonMode = 'previous_period' | 'previous_year' | 'none';

interface DateRange {
  start: Date;
  end: Date;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [manualRevenues, setManualRevenues] = useState<ManualRevenue[]>([]);
  const [plombiers, setPlombiers] = useState<User[]>([]);
  
  // Filtres de date
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [compareMode, setCompareMode] = useState<ComparisonMode>('previous_period');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, authLoading, router]);

  // Détecter la taille de l'écran pour le pie chart
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const loadDashboardData = async () => {
    try {
      // Charger tous les projets
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

      // Charger tous les clients
      const clientsQuery = query(collection(db, 'clients'));
      const clientsSnapshot = await getDocs(clientsQuery);
      const clientsData = clientsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Client[];
      setClients(clientsData);

      // Charger tous les documents
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

      // Charger les revenus manuels
      const revenuesQuery = query(collection(db, 'manualRevenues'));
      const revenuesSnapshot = await getDocs(revenuesQuery);
      const revenuesData = revenuesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        plombierHasPaid: doc.data().plombierHasPaid || false,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as ManualRevenue[];
      setManualRevenues(revenuesData);

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
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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

  // Calcul de la période de comparaison
  const getComparisonRange = useMemo((): DateRange | null => {
    if (compareMode === 'none') return null;

    const { start, end } = getDateRange;
    const duration = end.getTime() - start.getTime();
    let comparisonStart: Date;
    let comparisonEnd: Date;

    if (compareMode === 'previous_period') {
      // Période précédente de même durée
      comparisonEnd = new Date(start);
      comparisonEnd.setTime(comparisonEnd.getTime() - 1);
      comparisonStart = new Date(comparisonEnd);
      comparisonStart.setTime(comparisonStart.getTime() - duration);
    } else {
      // Même période année précédente
      comparisonStart = new Date(start);
      comparisonStart.setFullYear(comparisonStart.getFullYear() - 1);
      comparisonEnd = new Date(end);
      comparisonEnd.setFullYear(comparisonEnd.getFullYear() - 1);
    }

    return { start: comparisonStart, end: comparisonEnd };
  }, [getDateRange, compareMode]);

  // Factures payées (utilisé dans plusieurs calculs)
  const paidInvoices = useMemo(() => 
    documents.filter(d => d.type === 'facture' && d.status === 'paye'),
    [documents]
  );

  // Données filtrées par période (toujours données globales)
  const filteredData = useMemo(() => {
    const { start, end } = getDateRange;
    const existingClientIds = new Set(clients.map(c => c.id));
    
    // Factures payées dans la période ET client existant
    const filteredInvoices = paidInvoices.filter(d => {
      const invoiceDate = d.date;
      return invoiceDate >= start && invoiceDate <= end && existingClientIds.has(d.clientId);
    });
    
    // Projets dans la période ET client existant
    const filteredProjects = projects.filter(p => {
      const projectDate = p.createdAt || p.startDate;
      return projectDate >= start && projectDate <= end && existingClientIds.has(p.clientId);
    });
    
    // Revenus manuels dans la période ET client existant
    const filteredManualRevenues = manualRevenues.filter(r => {
      const revenueDate = r.date;
      return revenueDate >= start && revenueDate <= end && existingClientIds.has(r.clientId);
    });
    
    return { filteredInvoices, filteredProjects, filteredManualRevenues, filteredClientsByPlombier: clients };
  }, [paidInvoices, projects, manualRevenues, clients, getDateRange]);

  // Calcul des KPI avec filtres de date
  const kpis = useMemo(() => {
    const { start, end } = getDateRange;
    const comparisonRange = getComparisonRange;
    const { filteredInvoices, filteredProjects, filteredManualRevenues, filteredClientsByPlombier } = filteredData;
    
    // Revenus de la période
    const invoiceRevenue = filteredInvoices.reduce((sum, doc) => sum + (doc.total || 0), 0);
    const projectRevenue = filteredProjects
      .filter(p => p.amount && p.amount > 0)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const manualRevenue = filteredManualRevenues.reduce((sum, r) => sum + r.amount, 0);
    const totalRevenue = invoiceRevenue + projectRevenue + manualRevenue;
    
    // Calcul de la comparaison (uniquement clients existants)
    let comparisonRevenue = 0;
    if (comparisonRange) {
      const existingClientIds = new Set(filteredClientsByPlombier.map(c => c.id));
      
      const compFilteredInvoices = paidInvoices.filter(d => {
        const invoiceDate = d.date;
        return invoiceDate >= comparisonRange.start && invoiceDate <= comparisonRange.end && existingClientIds.has(d.clientId);
      });
      const compFilteredProjects = projects.filter(p => {
        const projectDate = p.createdAt || p.startDate;
        return projectDate >= comparisonRange.start && projectDate <= comparisonRange.end && existingClientIds.has(p.clientId);
      });
      const compFilteredManual = manualRevenues.filter(r => {
        const revenueDate = r.date;
        return revenueDate >= comparisonRange.start && revenueDate <= comparisonRange.end && existingClientIds.has(r.clientId);
      });
      
      comparisonRevenue = 
        compFilteredInvoices.reduce((sum, doc) => sum + (doc.total || 0), 0) +
        compFilteredProjects.filter(p => p.amount && p.amount > 0).reduce((sum, p) => sum + (p.amount || 0), 0) +
        compFilteredManual.reduce((sum, r) => sum + r.amount, 0);
    }
    
    const revenueChange = comparisonRange && comparisonRevenue > 0
      ? ((totalRevenue - comparisonRevenue) / comparisonRevenue) * 100
      : 0;
    
    // Projets
    const activeProjects = filteredProjects.filter(p => p.status === 'en_cours');
    const completedProjects = filteredProjects.filter(p => p.status === 'termine');
    const pendingProjects = filteredProjects.filter(p => p.status === 'en_attente');
    
    // Factures (uniquement clients existants)
    const existingClientIds = new Set(filteredClientsByPlombier.map(c => c.id));
    const filteredDocuments = documents.filter(d => {
      const docDate = d.date;
      return docDate >= start && docDate <= end && existingClientIds.has(d.clientId);
    });
    
    const totalInvoices = filteredDocuments.filter(d => d.type === 'facture');
    const unpaidInvoices = filteredDocuments.filter(d => 
      d.type === 'facture' && d.status !== 'paye' && d.status !== 'annule'
    );
    const overdueInvoices = unpaidInvoices.filter(d => {
      if (!d.dueDate) return false;
      return d.dueDate < new Date();
    });
    
    // Devis
    const quotes = filteredDocuments.filter(d => d.type === 'devis');
    const convertedQuotes = quotes.filter(q => {
      return documents.some(d => 
        d.type === 'facture' && 
        d.clientId === q.clientId &&
        d.date >= q.date
      );
    });
    const conversionRate = quotes.length > 0 
      ? (convertedQuotes.length / quotes.length) * 100 
      : 0;
    
    // Calculer la répartition réelle avec pourcentages personnalisés
    let totalPlombierShare = 0;
    let totalCompanyShare = 0;
    
    // Revenus des projets
    filteredProjects.forEach(project => {
      if (project.amount && project.amount > 0) {
        const plombierPercent = (project.plombierPercentage || 60) / 100;
        const companyPercent = 1 - plombierPercent;
        totalPlombierShare += project.amount * plombierPercent;
        totalCompanyShare += project.amount * companyPercent;
      }
    });
    
    // Revenus des factures (utiliser pourcentage du projet lié ou 60% par défaut)
    filteredInvoices.forEach(invoice => {
      if (existingClientIds.has(invoice.clientId)) {
        const relatedProject = filteredProjects.find(p => p.clientId === invoice.clientId);
        const plombierPercent = relatedProject ? (relatedProject.plombierPercentage || 60) / 100 : 0.6;
        const companyPercent = 1 - plombierPercent;
        totalPlombierShare += (invoice.total || 0) * plombierPercent;
        totalCompanyShare += (invoice.total || 0) * companyPercent;
      }
    });
    
    // Revenus des dépannages
    filteredManualRevenues.forEach(revenue => {
      if (existingClientIds.has(revenue.clientId)) {
        const plombierPercent = (revenue.plombierPercentage || 60) / 100;
        const companyPercent = 1 - plombierPercent;
        totalPlombierShare += revenue.amount * plombierPercent;
        totalCompanyShare += revenue.amount * companyPercent;
      }
    });
    
    const plombierRevenue = totalPlombierShare;
    const companyRevenue = totalCompanyShare;
    
    // Calculer les revenus SANS facture (exclure les projets et dépannages qui ont une facture)
    // Identifier les projets et dépannages qui ont une facture associée
    const projectsWithInvoice = new Set(
      documents
        .filter(d => d.type === 'facture' && d.projectId)
        .map(d => d.projectId)
        .filter((id): id is string => !!id)
    );
    const revenuesWithInvoice = new Set(
      documents
        .filter(d => d.type === 'facture' && d.manualRevenueId)
        .map(d => d.manualRevenueId)
        .filter((id): id is string => !!id)
    );
    
    // Revenus des projets SANS facture
    let revenueWithoutInvoice = 0;
    let plombierRevenueWithoutInvoice = 0;
    let companyRevenueWithoutInvoice = 0;
    
    filteredProjects.forEach(project => {
      if (project.amount && project.amount > 0 && !projectsWithInvoice.has(project.id)) {
        revenueWithoutInvoice += project.amount;
        const plombierPercent = (project.plombierPercentage || 60) / 100;
        const companyPercent = 1 - plombierPercent;
        plombierRevenueWithoutInvoice += project.amount * plombierPercent;
        companyRevenueWithoutInvoice += project.amount * companyPercent;
      }
    });
    
    // Revenus des dépannages SANS facture
    filteredManualRevenues.forEach(revenue => {
      if (existingClientIds.has(revenue.clientId) && !revenuesWithInvoice.has(revenue.id)) {
        revenueWithoutInvoice += revenue.amount;
        const plombierPercent = (revenue.plombierPercentage || 60) / 100;
        const companyPercent = 1 - plombierPercent;
        plombierRevenueWithoutInvoice += revenue.amount * plombierPercent;
        companyRevenueWithoutInvoice += revenue.amount * companyPercent;
      }
    });
    
    // Calculer les revenus AVEC facture (Revenus totaux - Revenus sans facture)
    const revenueWithInvoice = totalRevenue - revenueWithoutInvoice;
    const plombierRevenueWithInvoice = plombierRevenue - plombierRevenueWithoutInvoice;
    const companyRevenueWithInvoice = companyRevenue - companyRevenueWithoutInvoice;
    
    return {
      totalRevenue,
      comparisonRevenue,
      revenueChange,
      plombierRevenue,
      companyRevenue,
      revenueWithoutInvoice,
      plombierRevenueWithoutInvoice,
      companyRevenueWithoutInvoice,
      revenueWithInvoice,
      plombierRevenueWithInvoice,
      companyRevenueWithInvoice,
      totalProjects: filteredProjects.length,
      activeProjects: activeProjects.length,
      completedProjects: completedProjects.length,
      pendingProjects: pendingProjects.length,
      totalClients: filteredClientsByPlombier.length,
      totalInvoices: totalInvoices.length,
      paidInvoices: filteredInvoices.length,
      unpaidInvoices: unpaidInvoices.length,
      overdueInvoices: overdueInvoices.length,
      totalQuotes: quotes.length,
      conversionRate,
      totalDocuments: filteredDocuments.length,
    };
  }, [projects, clients, documents, manualRevenues, paidInvoices, getDateRange, getComparisonRange, filteredData]);

  // Calcul des statistiques de paiement aux plombiers
  const paymentStats = useMemo(() => {
    const { filteredProjects, filteredManualRevenues, filteredInvoices, filteredClientsByPlombier } = filteredData;
    const existingClientIds = new Set(filteredClientsByPlombier.map(c => c.id));
    
    let totalPaidToPlombiers = 0;
    let totalUnpaidToPlombiers = 0;
    
    // Calculer les paiements pour les projets
    // Utiliser le pourcentage personnalisé ou 60% par défaut
    filteredProjects.forEach(project => {
      if (project.amount && project.amount > 0 && project.plombierIds.length > 0) {
        const plombierPercent = (project.plombierPercentage || 60) / 100;
        const companyPercent = 1 - plombierPercent;
        const sharePerPlombier = (project.amount * companyPercent) / project.plombierIds.length;
        
        project.plombierIds.forEach(plombierId => {
          const hasPaid = project.paidByPlombierIds?.includes(plombierId) || false;
          if (hasPaid) {
            totalPaidToPlombiers += sharePerPlombier;
          } else {
            totalUnpaidToPlombiers += sharePerPlombier;
          }
        });
      }
    });
    
    // Calculer les paiements pour les factures (via clients assignés)
    // Plombier paie 40% à la société
    filteredInvoices.forEach(invoice => {
      if (existingClientIds.has(invoice.clientId)) {
        const client = clients.find(c => c.id === invoice.clientId);
        if (client?.assignedPlombierId) {
          // Pour les factures, utiliser le pourcentage du projet lié ou 60% par défaut
          const relatedProject = filteredProjects.find(p => 
            p.clientId === invoice.clientId
          );
          const plombierPercent = relatedProject ? (relatedProject.plombierPercentage || 60) / 100 : 0.6;
          const companyPercent = 1 - plombierPercent;
          const companyReceives = (invoice.total || 0) * companyPercent;
          
          // Vérifier si un projet lié a été payé
          if (relatedProject && relatedProject.paidByPlombierIds?.includes(client.assignedPlombierId)) {
            totalPaidToPlombiers += companyReceives;
          } else {
            // Si pas de projet lié payé, on considère comme non payé
            totalUnpaidToPlombiers += companyReceives;
          }
        }
      }
    });
    
    // Calculer les paiements pour les dépannages
    // Utiliser le pourcentage personnalisé ou 60% par défaut
    filteredManualRevenues.forEach(revenue => {
      if (revenue.plombierId) {
        const plombierPercent = (revenue.plombierPercentage || 60) / 100;
        const companyPercent = 1 - plombierPercent;
        const companyReceives = revenue.amount * companyPercent;
        if (revenue.plombierHasPaid) {
          totalPaidToPlombiers += companyReceives;
        } else {
          totalUnpaidToPlombiers += companyReceives;
        }
      }
    });
    
    // Calculer le détail par plombier (montants non payés)
    const unpaidByPlombier: { plombierId: string; plombierName: string; unpaidAmount: number }[] = [];
    const unpaidByPlombierMap: { [key: string]: { name: string; amount: number } } = {};

    // Projets non payés par plombier
    filteredProjects.forEach(project => {
      if (project.amount && project.amount > 0 && project.plombierIds.length > 0) {
        const plombierPercent = (project.plombierPercentage || 60) / 100;
        const companyPercent = 1 - plombierPercent;
        const sharePerPlombier = (project.amount * companyPercent) / project.plombierIds.length;
        
        project.plombierIds.forEach(plombierId => {
          const hasPaid = project.paidByPlombierIds?.includes(plombierId) || false;
          if (!hasPaid) {
            if (!unpaidByPlombierMap[plombierId]) {
              const plombier = plombiers.find(p => p.id === plombierId);
              unpaidByPlombierMap[plombierId] = {
                name: plombier?.name || 'Inconnu',
                amount: 0,
              };
            }
            unpaidByPlombierMap[plombierId].amount += sharePerPlombier;
          }
        });
      }
    });

    // Factures non payées par plombier
    filteredInvoices.forEach(invoice => {
      if (existingClientIds.has(invoice.clientId)) {
        const client = clients.find(c => c.id === invoice.clientId);
        if (client?.assignedPlombierId) {
          const relatedProject = filteredProjects.find(p => 
            p.clientId === invoice.clientId
          );
          const plombierPercent = relatedProject ? (relatedProject.plombierPercentage || 60) / 100 : 0.6;
          const companyPercent = 1 - plombierPercent;
          const companyReceives = (invoice.total || 0) * companyPercent;
          
          if (!relatedProject || !relatedProject.paidByPlombierIds?.includes(client.assignedPlombierId)) {
            if (!unpaidByPlombierMap[client.assignedPlombierId]) {
              unpaidByPlombierMap[client.assignedPlombierId] = {
                name: plombiers.find(p => p.id === client.assignedPlombierId)?.name || 'Inconnu',
                amount: 0,
              };
            }
            unpaidByPlombierMap[client.assignedPlombierId].amount += companyReceives;
          }
        }
      }
    });

    // Dépannages non payés par plombier
    filteredManualRevenues.forEach(revenue => {
      if (revenue.plombierId && !revenue.plombierHasPaid) {
        const plombierPercent = (revenue.plombierPercentage || 60) / 100;
        const companyPercent = 1 - plombierPercent;
        const companyReceives = revenue.amount * companyPercent;
        if (!unpaidByPlombierMap[revenue.plombierId]) {
          unpaidByPlombierMap[revenue.plombierId] = {
            name: plombiers.find(p => p.id === revenue.plombierId)?.name || 'Inconnu',
            amount: 0,
          };
        }
        unpaidByPlombierMap[revenue.plombierId].amount += companyReceives;
      }
    });

    // Convertir en tableau et trier par montant décroissant
    Object.entries(unpaidByPlombierMap).forEach(([plombierId, data]) => {
      if (data.amount > 0) {
        unpaidByPlombier.push({
          plombierId,
          plombierName: data.name,
          unpaidAmount: Math.round(data.amount),
        });
      }
    });
    unpaidByPlombier.sort((a, b) => b.unpaidAmount - a.unpaidAmount);

    return {
      totalPaid: Math.round(totalPaidToPlombiers),
      totalUnpaid: Math.round(totalUnpaidToPlombiers),
      totalDue: Math.round(totalPaidToPlombiers + totalUnpaidToPlombiers),
      unpaidByPlombier,
    };
  }, [filteredData, clients, plombiers]);

  // Données pour graphique revenus par mois (selon la période)
  const monthlyRevenueData = useMemo(() => {
    const { start, end } = getDateRange;
    const months: { [key: string]: number } = {};
    
    // Générer les mois dans la plage
    const current = new Date(start);
    while (current <= end) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      months[monthKey] = 0;
      current.setMonth(current.getMonth() + 1);
    }
    
    // Utiliser les données filtrées
    const { filteredInvoices, filteredProjects, filteredManualRevenues, filteredClientsByPlombier } = filteredData;
    const existingClientIds = new Set(filteredClientsByPlombier.map(c => c.id));
    
    // Factures payées dans la période (filtrées par plombier si nécessaire)
    filteredInvoices.forEach(doc => {
      const date = doc.date;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (months[monthKey] !== undefined) {
        months[monthKey] += doc.total || 0;
      }
    });
    
    // Projets dans la période (filtrés par plombier si nécessaire)
    filteredProjects.forEach(project => {
      if (project.amount && project.amount > 0) {
        const projectDate = project.createdAt || project.startDate;
        const monthKey = `${projectDate.getFullYear()}-${String(projectDate.getMonth() + 1).padStart(2, '0')}`;
        if (months[monthKey] !== undefined) {
          months[monthKey] += project.amount;
        }
      }
    });
    
    // Revenus manuels dans la période (filtrés par plombier si nécessaire)
    filteredManualRevenues.forEach(revenue => {
      const date = revenue.date;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (months[monthKey] !== undefined) {
        months[monthKey] += revenue.amount;
      }
    });
    
    return Object.entries(months).map(([month, revenue]) => {
      const [year, monthNum] = month.split('-');
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      return {
        month: monthNames[parseInt(monthNum) - 1],
        revenus: Math.round(revenue),
      };
    });
  }, [filteredData, getDateRange]);

  // Données pour graphique revenus par type de projet (dans la période) - filtrées par plombier si nécessaire
  const revenueByProjectType = useMemo(() => {
    const { filteredProjects } = filteredData;
    const typeMap: { [key: string]: number } = {};
    
    filteredProjects.forEach(project => {
      if (project.amount && project.amount > 0) {
        const typeName = 
          project.type === 'recherche_fuite' ? 'Recherche fuite' :
          project.type === 'reparation_lourde' ? 'Réparation lourde' :
          project.type === 'renovation_salle_bain' ? 'Rénovation SDB' : 'Autre';
        
        typeMap[typeName] = (typeMap[typeName] || 0) + project.amount;
      }
    });
    
    return Object.entries(typeMap).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }));
  }, [filteredData]);

  // Top clients par revenus (dans la période) - filtrés par plombier si nécessaire
  const topClients = useMemo(() => {
    const { filteredInvoices, filteredProjects, filteredManualRevenues, filteredClientsByPlombier } = filteredData;
    const clientRevenue: { [key: string]: number } = {};
    
    // Factures dans la période (déjà filtrées)
    filteredInvoices.forEach(doc => {
      clientRevenue[doc.clientId] = (clientRevenue[doc.clientId] || 0) + (doc.total || 0);
    });
    
    // Projets dans la période (déjà filtrés)
    filteredProjects.forEach(project => {
      if (project.amount && project.amount > 0) {
        clientRevenue[project.clientId] = (clientRevenue[project.clientId] || 0) + project.amount;
      }
    });
    
    // Revenus manuels dans la période (déjà filtrés)
    filteredManualRevenues.forEach(revenue => {
      clientRevenue[revenue.clientId] = (clientRevenue[revenue.clientId] || 0) + revenue.amount;
    });
    
    return Object.entries(clientRevenue)
      .map(([clientId, revenue]) => {
        const client = filteredClientsByPlombier.find(c => c.id === clientId);
        return {
          name: client?.name || 'Client supprimé',
          revenue: Math.round(revenue),
        };
      })
      .filter(item => item.name !== 'Client supprimé') // Exclure les clients supprimés
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredData]);

  // Revenus par plombier (dans la période)
  const revenueByPlombier = useMemo(() => {
    const { filteredInvoices, filteredProjects, filteredManualRevenues } = filteredData;
    const plombierRevenue: { [key: string]: { name: string; revenue: number; projects: number; unpaid: number } } = {};
    
    // Initialiser tous les plombiers
    plombiers.forEach(plombier => {
      plombierRevenue[plombier.id] = {
        name: plombier.name,
        revenue: 0,
        projects: 0,
        unpaid: 0,
      };
    });
    
    // Revenus des projets (pourcentage personnalisé pour chaque plombier assigné, réparti équitablement)
    filteredProjects.forEach(project => {
      if (project.amount && project.amount > 0 && project.plombierIds.length > 0) {
        const plombierPercent = (project.plombierPercentage || 60) / 100;
        const companyPercent = 1 - plombierPercent;
        const sharePerPlombier = (project.amount * plombierPercent) / project.plombierIds.length;
        const companySharePerPlombier = (project.amount * companyPercent) / project.plombierIds.length;
        
        project.plombierIds.forEach(plombierId => {
          if (plombierRevenue[plombierId]) {
            plombierRevenue[plombierId].revenue += sharePerPlombier;
            plombierRevenue[plombierId].projects += 1;
            
            // Calculer le montant non payé (part société que le plombier doit payer)
            const hasPaid = project.paidByPlombierIds?.includes(plombierId) || false;
            if (!hasPaid) {
              plombierRevenue[plombierId].unpaid += companySharePerPlombier;
            }
          }
        });
      }
    });
    
    // Revenus des factures (pourcentage personnalisé pour le plombier assigné au client)
    const existingClientIds = new Set(clients.map(c => c.id));
    filteredInvoices.forEach(invoice => {
      if (existingClientIds.has(invoice.clientId)) {
        const client = clients.find(c => c.id === invoice.clientId);
        if (client?.assignedPlombierId && plombierRevenue[client.assignedPlombierId]) {
          // Utiliser le pourcentage du projet lié ou 60% par défaut
          const relatedProject = filteredProjects.find(p => p.clientId === invoice.clientId);
          const plombierPercent = relatedProject ? (relatedProject.plombierPercentage || 60) / 100 : 0.6;
          plombierRevenue[client.assignedPlombierId].revenue += (invoice.total || 0) * plombierPercent;
          
          // Calculer le montant non payé (part société que le plombier doit payer)
          const companyPercent = 1 - plombierPercent;
          if (!relatedProject || !relatedProject.paidByPlombierIds?.includes(client.assignedPlombierId)) {
            plombierRevenue[client.assignedPlombierId].unpaid += (invoice.total || 0) * companyPercent;
          }
        }
      }
    });
    
    // Revenus manuels (pourcentage personnalisé pour le plombier spécifié)
    filteredManualRevenues.forEach(revenue => {
      if (existingClientIds.has(revenue.clientId) && revenue.plombierId && plombierRevenue[revenue.plombierId]) {
        const plombierPercent = (revenue.plombierPercentage || 60) / 100;
        plombierRevenue[revenue.plombierId].revenue += revenue.amount * plombierPercent;
        
        // Calculer le montant non payé (part société que le plombier doit payer)
        if (!revenue.plombierHasPaid) {
          const companyPercent = 1 - plombierPercent;
          plombierRevenue[revenue.plombierId].unpaid += revenue.amount * companyPercent;
        }
      }
    });
    
    // Retourner TOUS les plombiers, même ceux avec 0 revenus
    return Object.values(plombierRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .map(p => ({
        name: p.name,
        revenue: Math.round(p.revenue),
        projects: p.projects,
        unpaid: Math.round(p.unpaid),
      }));
  }, [filteredData, clients, plombiers]);

  // Projets récents (filtrés par plombier si nécessaire)
  const recentProjects = useMemo(() => {
    const { filteredProjects } = filteredData;
    return filteredProjects
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);
  }, [filteredData]);

  // Format de la période
  const formatPeriodLabel = () => {
    const { start, end } = getDateRange;
    const formatDateShort = (date: Date) => {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    };
    
    if (datePreset === 'custom') {
      return `${formatDateShort(start)} - ${formatDateShort(end)}`;
    }
    
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
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Tableau de bord
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
              Bienvenue, {user?.name}
            </p>
          </div>
          
          {/* Sélecteur de dates style Google Ads */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative date-picker-container w-full sm:w-auto">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="btn btn-secondary flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center"
              >
                <Calendar size={16} />
                <span className="truncate">{formatPeriodLabel()}</span>
                <ChevronDown size={14} />
              </button>
              
              {showDatePicker && (
                <div className="absolute top-full left-0 right-0 sm:right-auto mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 min-w-[280px] sm:min-w-[320px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Période</h3>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
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
                          if (preset !== 'custom') {
                            setShowDatePicker(false);
                          }
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
                      onClick={() => {
                        if (customStartDate && customEndDate) {
                          setShowDatePicker(false);
                        }
                      }}
                      className="btn btn-primary w-full text-sm"
                    >
                      Appliquer
                    </button>
                  </div>
                )}
                
                <div className="pt-3 border-t border-gray-200 mt-4">
                  <label className="block text-xs text-gray-600 mb-2">Comparer avec</label>
                  <select
                    value={compareMode}
                    onChange={(e) => setCompareMode(e.target.value as ComparisonMode)}
                    className="input text-sm"
                  >
                    <option value="none">Aucune comparaison</option>
                    <option value="previous_period">Période précédente</option>
                    <option value="previous_year">Même période année précédente</option>
                  </select>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* KPI Principaux */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Revenus totaux */}
          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-green-700 font-medium">Revenus totaux</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-900 mt-1 sm:mt-2 truncate">{formatCurrency(kpis.totalRevenue)}</p>
                {compareMode !== 'none' && kpis.comparisonRevenue > 0 && (
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                    {kpis.revenueChange >= 0 ? (
                      <TrendingUp className="text-green-600" size={12} />
                    ) : (
                      <TrendingDown className="text-red-600" size={12} />
                    )}
                    <span className={`text-xs font-medium ${
                      kpis.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {kpis.revenueChange >= 0 ? '+' : ''}{kpis.revenueChange.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500 hidden sm:inline">
                      vs {compareMode === 'previous_period' ? 'période précédente' : 'année précédente'}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-1.5 sm:p-2 lg:p-3 bg-green-200 rounded-lg flex-shrink-0">
                <DollarSign className="text-green-700 w-4 h-4 sm:w-5 sm:h-5 lg:w-7 lg:h-7" />
              </div>
            </div>
          </div>

          {/* Répartition revenus */}


          {/* Clients */}
          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-purple-700 font-medium">Clients</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-900 mt-1 sm:mt-2">{kpis.totalClients}</p>
                <p className="text-xs text-purple-600 mt-1">Base clients totale</p>
              </div>
              <div className="p-1.5 sm:p-2 lg:p-3 bg-purple-200 rounded-lg flex-shrink-0">
                <Users className="text-purple-700 w-4 h-4 sm:w-5 sm:h-5 lg:w-7 lg:h-7" />
              </div>
            </div>
          </div>
        </div>

        {/* KPI Secondaires */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Répartition revenus */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Part plombier</p>
              <Users className="text-primary-600 w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-primary-600 truncate">{formatCurrency(kpis.plombierRevenue)}</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Part société</p>
              <TrendingUp className="text-blue-600 w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 truncate">{formatCurrency(kpis.companyRevenue)}</p>
          </div>

          {/* Revenus avec facture */}
          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-green-700 font-medium">Revenus avec facture</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-900 mt-1 truncate">{formatCurrency(kpis.revenueWithInvoice)}</p>
                <p className="text-xs text-green-600 mt-1">
                  Plombier: {formatCurrency(kpis.plombierRevenueWithInvoice)} • Société: {formatCurrency(kpis.companyRevenueWithInvoice)}
                </p>
              </div>
              <div className="p-1.5 sm:p-2 bg-green-200 rounded-lg flex-shrink-0 ml-2">
                <FileText className="text-green-700 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>

          {/* Revenus sans facture */}
          <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-orange-700 font-medium">Revenus sans facture</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-900 mt-1 truncate">{formatCurrency(kpis.revenueWithoutInvoice)}</p>
                <p className="text-xs text-orange-600 mt-1">
                  Plombier: {formatCurrency(kpis.plombierRevenueWithoutInvoice)} • Société: {formatCurrency(kpis.companyRevenueWithoutInvoice)}
                </p>
              </div>
              <div className="p-1.5 sm:p-2 bg-orange-200 rounded-lg flex-shrink-0 ml-2">
                <FileText className="text-orange-700 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>


        </div>

        {/* Statistiques de paiement aux plombiers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="card bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-green-700 font-medium">Payé par les plombiers</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-900 mt-1 sm:mt-2 truncate">
                    {formatCurrency(paymentStats.totalPaid)}
                  </p>
                </div>
                <div className="p-1.5 sm:p-2 lg:p-3 bg-green-200 rounded-lg flex-shrink-0">
                  <CheckCircle className="text-green-700 w-4 h-4 sm:w-5 sm:h-5 lg:w-7 lg:h-7" />
                </div>
              </div>
            </div>

            <div className="card bg-orange-50 border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-orange-700 font-medium">Non payé par les plombiers</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-900 mt-1 sm:mt-2 truncate">
                    {formatCurrency(paymentStats.totalUnpaid)}
                  </p>
                </div>
                <div className="p-1.5 sm:p-2 lg:p-3 bg-orange-200 rounded-lg flex-shrink-0">
                  <Clock className="text-orange-700 w-4 h-4 sm:w-5 sm:h-5 lg:w-7 lg:h-7" />
                </div>
              </div>
            </div>

            <div className="card bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-blue-700 font-medium">Total dû par les plombiers</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 mt-1 sm:mt-2 truncate">
                    {formatCurrency(paymentStats.totalDue)}
                  </p>
                </div>
                <div className="p-1.5 sm:p-2 lg:p-3 bg-blue-200 rounded-lg flex-shrink-0">
                  <DollarSign className="text-blue-700 w-4 h-4 sm:w-5 sm:h-5 lg:w-7 lg:h-7" />
                </div>
              </div>
            </div>
          </div>

        {/* Récapitulatif des plombiers non payés */}
        {paymentStats.unpaidByPlombier.length > 0 && (
          <div className="card">
            <div className="mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Plombiers non payés</h2>
              <p className="text-sm text-gray-600 mt-1">Montants restants à recevoir de chaque plombier</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] sm:min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Plombier</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Montant restant</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paymentStats.unpaidByPlombier.map((item) => (
                    <tr key={item.plombierId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.plombierName}</div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-right">
                        <div className="text-sm font-bold text-orange-600">{formatCurrency(item.unpaidAmount)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-sm font-bold text-gray-900">Total</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-sm font-bold text-orange-600">
                      {formatCurrency(paymentStats.totalUnpaid)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Revenus par mois */}
          <div className="card">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
              <BarChart3 className="mr-2 w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base">Revenus par mois (6 derniers mois)</span>
            </h2>
            <ResponsiveContainer width="100%" height={200} className="sm:h-[300px]">
              <LineChart data={monthlyRevenueData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis width={50} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number | undefined) => value ? formatCurrency(value) : ''} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line 
                  type="monotone" 
                  dataKey="revenus" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Revenus (MAD)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Revenus par type de projet */}
          <div className="card">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
              <PieChart className="mr-2 w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base">Revenus par type de projet</span>
            </h2>
            <ResponsiveContainer width="100%" height={200} className="sm:h-[300px]">
              <RechartsPieChart>
                <Pie
                  data={revenueByProjectType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={isMobile ? 60 : 70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueByProjectType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number | undefined) => value ? formatCurrency(value) : ''} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top clients et projets récents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Top 5 clients */}
          <div className="card">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
              <Users className="mr-2 w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base">Top 5 clients par revenus</span>
            </h2>
            <ResponsiveContainer width="100%" height={200} className="sm:h-[300px]">
              <BarChart data={topClients} margin={{ top: 5, right: 5, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  className="text-xs"
                  tick={{ fontSize: 9 }}
                  interval={0}
                />
                <YAxis width={50} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number | undefined) => value ? formatCurrency(value) : ''} />
                <Bar dataKey="revenue" fill="#3B82F6" name="Revenus (MAD)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Projets récents */}
          <div className="card">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
              <FolderKanban className="mr-2 w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base">Projets récents</span>
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {recentProjects.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun projet pour le moment</p>
              ) : (
                recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="p-2 sm:p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <a
                          href={`/projets/${project.id}`}
                          className="text-primary-600 hover:underline font-medium text-xs sm:text-sm block truncate"
                        >
                          {project.title}
                        </a>
                        <p className="text-xs text-gray-500 mt-1">
                          {project.type === 'recherche_fuite' && 'Recherche de fuite'}
                          {project.type === 'reparation_lourde' && 'Réparation lourde'}
                          {project.type === 'renovation_salle_bain' && 'Rénovation salle de bain'}
                          {project.amount && project.amount > 0 && (
                            <span className="ml-2">• {formatCurrency(project.amount)}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-row sm:flex-col sm:items-end items-center justify-between sm:justify-end gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            project.status === 'en_cours'
                              ? 'bg-green-100 text-green-700'
                              : project.status === 'termine'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {project.status === 'en_cours' && 'En cours'}
                          {project.status === 'termine' && 'Terminé'}
                          {project.status === 'en_attente' && 'En attente'}
                          {project.status === 'en_pause' && 'En pause'}
                          {project.status === 'annule' && 'Annulé'}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(project.createdAt)}</p>
                      </div>
                    </div>
                    {project.progress !== undefined && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Avancement</span>
                          <span>{project.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Revenus par plombier */}
        {plombiers.length > 0 && revenueByPlombier.length > 0 && (
          <div className="card">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
              <Users className="mr-2 w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base">Répartition des revenus par plombier</span>
            </h2>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-2 sm:px-0">
                <table className="w-full min-w-[500px] sm:min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-700">Plombier</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-700">Revenus</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-700">Non payé</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-700">Projets</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-700">% du total</th>
                    </tr>
                  </thead>
                <tbody>
                  {revenueByPlombier.map((plombier, index) => {
                    const percentage = kpis.plombierRevenue > 0 
                      ? (plombier.revenue / kpis.plombierRevenue) * 100 
                      : 0;
                    const plombierUser = plombiers.find(p => p.name === plombier.name);
                      return (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 sm:py-3 px-2 sm:px-4">
                          <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-primary-700 font-medium text-xs sm:text-sm">
                                {plombier.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900 text-xs sm:text-sm truncate">{plombier.name}</span>
                            {plombierUser && (
                              <Link
                                href={`/plombiers/${plombierUser.id}`}
                                className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded flex-shrink-0"
                                title="Modifier"
                              >
                                <Edit className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              </Link>
                            )}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-right">
                          <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                            {formatCurrency(plombier.revenue)}
                          </span>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-right">
                          <span className={`font-semibold text-xs sm:text-sm ${
                            plombier.unpaid > 0 ? 'text-orange-600' : 'text-gray-500'
                          }`}>
                            {formatCurrency(plombier.unpaid)}
                          </span>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-gray-600 text-xs sm:text-sm">
                          {plombier.projects}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-right">
                          <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                            <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-1.5 sm:h-2">
                              <div
                                className="bg-primary-600 h-1.5 sm:h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-xs sm:text-sm text-gray-600 w-10 sm:w-12 text-right">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Total</td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm">
                        {formatCurrency(revenueByPlombier.reduce((sum, p) => sum + p.revenue, 0))}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm">
                        <span className="text-orange-600">
                          {formatCurrency(revenueByPlombier.reduce((sum, p) => sum + p.unpaid, 0))}
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm">
                        {revenueByPlombier.reduce((sum, p) => sum + p.projects, 0)}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Alertes */}
        {(kpis.overdueInvoices > 0 || kpis.pendingProjects > 0) && (
          <div className="card bg-yellow-50 border-yellow-200">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
              <AlertCircle className="mr-2 text-yellow-600 w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base">Alertes</span>
            </h2>
            <div className="space-y-2">
              {kpis.overdueInvoices > 0 && (
                <div className="flex items-center space-x-2 text-yellow-800">
                  <AlertCircle size={18} />
                  <span>
                    <strong>{kpis.overdueInvoices}</strong> facture{kpis.overdueInvoices > 1 ? 's' : ''} en retard
                  </span>
                </div>
              )}
              {kpis.pendingProjects > 0 && (
                <div className="flex items-center space-x-2 text-yellow-800">
                  <Clock size={18} />
                  <span>
                    <strong>{kpis.pendingProjects}</strong> projet{kpis.pendingProjects > 1 ? 's' : ''} en attente
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
