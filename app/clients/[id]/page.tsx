'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Client, Project, Document, DocumentItem, User, PlanningEntry, ClientStats, ManualRevenue, ClientPromoCode } from '@/types';
import { formatDate, formatCurrency, isPlombierAssignable } from '@/lib/utils';
import { 
  ArrowLeft, 
  DollarSign, 
  Calendar, 
  Users, 
  FileText, 
  TrendingUp,
  Phone,
  Mail,
  MapPin,
  Edit,
  Plus,
  Trash2,
  Send,
  Tag,
  KeyRound
} from 'lucide-react';
import Link from 'next/link';

export default function ClientDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  
  const [client, setClient] = useState<Client | null>(null);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [appointments, setAppointments] = useState<PlanningEntry[]>([]);
  const [manualRevenues, setManualRevenues] = useState<ManualRevenue[]>([]);
  const [assignedPlombier, setAssignedPlombier] = useState<User | null>(null);
  const [allPlombiers, setAllPlombiers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<ManualRevenue | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [documentType, setDocumentType] = useState<'facture' | 'devis' | 'bon_commande'>('devis');
  const [emailData, setEmailData] = useState({ subject: '', message: '' });
  const [smsData, setSmsData] = useState({ message: '' });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [sendingAccessCode, setSendingAccessCode] = useState(false);
  const [clientPromoCodes, setClientPromoCodes] = useState<ClientPromoCode[]>([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoFormData, setPromoFormData] = useState({
    code: '',
    label: '',
    discountType: 'percent' as 'percent' | 'fixed',
    discountValue: 10,
    expiresAt: '',
  });
  const [documentFormData, setDocumentFormData] = useState({
    type: 'devis' as Document['type'],
    projectId: '',
    manualRevenueId: '',
    number: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    items: [] as DocumentItem[],
    subtotal: 0,
    tax: 0,
    total: 0,
    status: 'brouillon' as Document['status'],
    notes: '',
  });
  const [currentDocumentItem, setCurrentDocumentItem] = useState({
    description: '',
    quantity: 1,
    unitPrice: 0,
  });
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && clientId) {
      loadClientData();
    }
  }, [user, authLoading, router, clientId]);

  const loadClientData = async () => {
    try {
      // Charger le client
      const clientDoc = await getDoc(doc(db, 'clients', clientId));
      if (!clientDoc.exists()) {
        router.push('/clients');
        return;
      }
      
      const clientData = {
        id: clientDoc.id,
        ...clientDoc.data(),
        createdAt: clientDoc.data().createdAt?.toDate() || new Date(),
        updatedAt: clientDoc.data().updatedAt?.toDate() || new Date(),
      } as Client;
      
      setClient(clientData);

      // Charger tous les plombiers
      const plombiersQuery = query(collection(db, 'users'), where('role', '==', 'plombier'));
      const plombiersSnapshot = await getDocs(plombiersQuery);
      const plombiersData = plombiersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as User[];
      setAllPlombiers(plombiersData);

      // Trouver le plombier assigné
      if (clientData.assignedPlombierId) {
        const assignedPlombierData = plombiersData.find(p => p.id === clientData.assignedPlombierId);
        if (assignedPlombierData) {
          setAssignedPlombier(assignedPlombierData);
        }
      }

      // Charger les projets
      const projectsQuery = query(collection(db, 'projects'), where('clientId', '==', clientId));
      const projectsSnapshot = await getDocs(projectsQuery);
      const projectsData = projectsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate() || new Date(),
        endDate: doc.data().endDate?.toDate(),
        amount: doc.data().amount || undefined,
        hasInvoice: doc.data().hasInvoice || false,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Project[];
      setProjects(projectsData);

      // Charger les documents
      const documentsQuery = query(collection(db, 'documents'), where('clientId', '==', clientId));
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

      // Charger les rendez-vous (planning entries pour ce client via projets)
      let appointmentsData: PlanningEntry[] = [];
      if (clientData.assignedPlombierId && projectsData.length > 0) {
        const projectIds = projectsData.map(p => p.id);
        const planningQuery = query(collection(db, 'planning'));
        const planningSnapshot = await getDocs(planningQuery);
        appointmentsData = (planningSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate() || new Date(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          })) as PlanningEntry[])
          .filter((entry) => {
            return entry.plombierId === clientData.assignedPlombierId &&
                   entry.projectId &&
                   projectIds.includes(entry.projectId) &&
                   entry.type === 'project';
          });
      }
      setAppointments(appointmentsData);

      // Charger les revenus manuels
      const revenuesQuery = query(collection(db, 'manualRevenues'), where('clientId', '==', clientId));
      const revenuesSnapshot = await getDocs(revenuesQuery);
      const revenuesData = revenuesSnapshot.docs
        .filter((d) => !d.data().deleted)
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate() || new Date(),
          plombierHasPaid: doc.data().plombierHasPaid || false,
          deleted: doc.data().deleted || false,
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as ManualRevenue[];
      setManualRevenues(revenuesData);

      // Charger les codes promo
      const promosQuery = query(collection(db, 'clientPromoCodes'), where('clientId', '==', clientId));
      const promosSnapshot = await getDocs(promosQuery);
      const promosData = promosSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        activatedAt: d.data().activatedAt?.toDate() || new Date(),
        usedAt: d.data().usedAt?.toDate(),
        expiresAt: d.data().expiresAt?.toDate(),
      })) as ClientPromoCode[];
      setClientPromoCodes(promosData);

      // Calculer les statistiques
      const calculatedStats = calculateClientStats(projectsData, documentsData, appointmentsData, revenuesData);
      setStats(calculatedStats);
    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateClientStats = (
    projects: Project[],
    documents: Document[],
    appointments: PlanningEntry[],
    manualRevenues: ManualRevenue[]
  ): ClientStats => {
    // Revenus des factures payées (utiliser pourcentage du projet lié ou 60% par défaut)
    const paidInvoices = documents.filter(
      d => d.type === 'facture' && d.status === 'paye'
    );
    let totalPlombierShare = 0;
    let totalCompanyShare = 0;
    
    paidInvoices.forEach(invoice => {
      const relatedProject = projects.find(p => p.clientId === invoice.clientId);
      const plombierPercent = relatedProject ? (relatedProject.plombierPercentage || 60) / 100 : 0.6;
      const companyPercent = 1 - plombierPercent;
      totalPlombierShare += invoice.total * plombierPercent;
      totalCompanyShare += invoice.total * companyPercent;
    });
    
    // Revenus des projets (montants saisis manuellement avec pourcentage personnalisé)
    projects.forEach(project => {
      if (project.amount && project.amount > 0) {
        const plombierPercent = (project.plombierPercentage || 60) / 100;
        const companyPercent = 1 - plombierPercent;
        totalPlombierShare += project.amount * plombierPercent;
        totalCompanyShare += project.amount * companyPercent;
      }
    });
    
    // Dépannages (revenus sans facture avec pourcentage personnalisé)
    manualRevenues.forEach(revenue => {
      const plombierPercent = (revenue.plombierPercentage || 60) / 100;
      const companyPercent = 1 - plombierPercent;
      totalPlombierShare += revenue.amount * plombierPercent;
      totalCompanyShare += revenue.amount * companyPercent;
    });
    
    // Total = factures + projets + dépannages
    const totalRevenue = totalPlombierShare + totalCompanyShare;
    const plombierRevenue = totalPlombierShare;
    const companyRevenue = totalCompanyShare;

    const nextAppointment = appointments.length > 0
      ? appointments
          .filter(a => a.date >= new Date())
          .sort((a, b) => a.date.getTime() - b.date.getTime())[0]?.date
      : undefined;

    return {
      totalRevenue,
      totalProjects: projects.length,
      completedProjects: projects.filter(p => p.status === 'termine').length,
      pendingProjects: projects.filter(p => p.status === 'en_cours' || p.status === 'en_attente').length,
      totalInvoices: documents.filter(d => d.type === 'facture').length,
      paidInvoices: paidInvoices.length,
      unpaidInvoices: documents.filter(d => d.type === 'facture' && d.status !== 'paye' && d.status !== 'annule').length,
      plombierRevenue,
      companyRevenue,
      lastProjectDate: projects.length > 0
        ? projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
        : undefined,
      nextAppointment,
    };
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

  if (!client) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <p className="text-gray-500">Client introuvable</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link href="/clients" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{client.name}</h1>
              {client.companyName && (
                <p className="text-gray-600 mt-1">{client.companyName}</p>
              )}
              {client.clientType && (
                <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded ${
                  client.clientType === 'professionnel' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {client.clientType === 'professionnel' ? 'Professionnel' : 'Particulier'}
                </span>
              )}
            </div>
          </div>
          <Link href="/clients" className="btn btn-secondary flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center">
            <Edit size={18} className="sm:w-5 sm:h-5" />
            <span>Modifier</span>
          </Link>
        </div>

        {/* Statistiques financières */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="card">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600">Revenus totaux</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
                <DollarSign className="text-green-600 w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Part plombier</p>
                  <p className="text-2xl font-bold text-primary-600 mt-1">
                    {formatCurrency(stats.plombierRevenue)}
                  </p>
                </div>
                <Users className="text-primary-600" size={32} />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Part société</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {formatCurrency(stats.companyRevenue)}
                  </p>
                </div>
                <TrendingUp className="text-blue-600" size={32} />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Projets</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.totalProjects}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.completedProjects} terminés
                  </p>
                </div>
                <FileText className="text-gray-600" size={32} />
              </div>
            </div>
          </div>
        )}

        {/* Statistiques supplémentaires */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <p className="text-sm text-gray-600">Factures</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.totalInvoices}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.paidInvoices} payées • {stats.unpaidInvoices} impayées
              </p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600">Projets en cours</p>
              <p className="text-xl font-bold text-primary-600 mt-1">
                {stats.pendingProjects}
              </p>
            </div>
            {stats.lastProjectDate && (
              <div className="card">
                <p className="text-sm text-gray-600">Dernier projet</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatDate(stats.lastProjectDate)}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Informations client */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Informations</h2>
              <div className="space-y-3">
                {client.phone && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Phone size={18} className="text-gray-400" />
                      <span className="text-sm text-gray-700">{client.phone}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSmsData({ message: `Bonjour ${client.name},\n\n` });
                        setShowSmsModal(true);
                      }}
                      className="btn btn-sm btn-primary flex items-center space-x-1"
                      title="Envoyer un SMS"
                    >
                      <Phone size={14} />
                      <span>SMS</span>
                    </button>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mail size={18} className="text-gray-400" />
                      <span className="text-sm text-gray-700">{client.email}</span>
                    </div>
                    <button
                      onClick={() => {
                        setEmailData({ subject: `Message de Le Plombier`, message: `Bonjour ${client.name},\n\n` });
                        setShowEmailModal(true);
                      }}
                      className="btn btn-sm btn-primary flex items-center space-x-1"
                      title="Envoyer un email"
                    >
                      <Mail size={14} />
                      <span>Email</span>
                    </button>
                  </div>
                )}
                <div className="flex items-start space-x-2">
                  <MapPin size={18} className="text-gray-400 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    <p>{client.address}</p>
                    <p>{client.postalCode} {client.city}</p>
                  </div>
                </div>
                {client.ice && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500">ICE:</span>
                    <span className="text-sm text-gray-700 ml-2">{client.ice}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Espace client</p>
                  <p className="text-sm text-gray-600 mb-2">
                    Envoyer un code d&apos;accès par SMS pour que le client puisse se connecter. Utilisez ce bouton si le client a oublié son code.
                  </p>
                  <button
                    onClick={async () => {
                      if (!client.phone) {
                        alert('Ce client n\'a pas de numéro de téléphone.');
                        return;
                      }
                      setSendingAccessCode(true);
                      try {
                        const res = await fetch('/api/espace-client/send-code', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ phone: client.phone, forceResend: true }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          alert('Code envoyé par SMS avec succès.');
                        } else {
                          alert(data.error || 'Erreur lors de l\'envoi du code.');
                        }
                      } catch {
                        alert('Erreur de connexion.');
                      } finally {
                        setSendingAccessCode(false);
                      }
                    }}
                    disabled={sendingAccessCode || !client.phone}
                    className="btn btn-secondary btn-sm flex items-center gap-2"
                  >
                    <KeyRound size={16} />
                    {sendingAccessCode ? 'Envoi...' : 'Envoyer code d\'accès'}
                  </button>
                </div>
                {assignedPlombier && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Plombier assigné:</p>
                    <p className="text-sm font-medium text-gray-900">{assignedPlombier.name}</p>
                    {assignedPlombier.phone && (
                      <p className="text-xs text-gray-600">{assignedPlombier.phone}</p>
                    )}
                  </div>
                )}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500">Notes</p>
                    {!editingNotes ? (
                      <button
                        onClick={() => {
                          setNotesDraft(client.notes || '');
                          setEditingNotes(true);
                        }}
                        className="p-1 text-gray-400 hover:text-primary-600"
                        title="Modifier"
                      >
                        <Edit size={16} />
                      </button>
                    ) : null}
                  </div>
                  {editingNotes ? (
                    <div className="space-y-2">
                      <textarea
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        className="input text-sm min-h-[80px]"
                        placeholder="Ajouter des notes sur ce client..."
                        rows={4}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            setSavingNotes(true);
                            try {
                              await updateDoc(doc(db, 'clients', clientId), {
                                notes: notesDraft.trim() || null,
                                updatedAt: Timestamp.now(),
                              });
                              setClient((prev) => prev ? { ...prev, notes: notesDraft.trim() || undefined, updatedAt: new Date() } : null);
                              setEditingNotes(false);
                            } catch (error) {
                              console.error('Error saving notes:', error);
                              alert('Erreur lors de la sauvegarde des notes');
                            } finally {
                              setSavingNotes(false);
                            }
                          }}
                          disabled={savingNotes}
                          className="btn btn-primary btn-sm"
                        >
                          {savingNotes ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                        <button
                          onClick={() => {
                            setNotesDraft(client.notes || '');
                            setEditingNotes(false);
                          }}
                          disabled={savingNotes}
                          className="btn btn-secondary btn-sm"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {client.notes || <span className="text-gray-400 italic">Aucune note</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Prochain rendez-vous */}
            {stats?.nextAppointment && (
              <div className="card bg-primary-50 border border-primary-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="text-primary-600" size={20} />
                  <h3 className="font-semibold text-primary-900">Prochain rendez-vous</h3>
                </div>
                <p className="text-sm text-primary-700">
                  {formatDate(stats.nextAppointment)}
                </p>
              </div>
            )}

            {/* Planning du plombier */}
            {assignedPlombier && appointments.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Planning - {assignedPlombier.name}
                </h2>
                <div className="space-y-2">
                  {appointments.slice(0, 5).map((appointment) => (
                    <div
                      key={appointment.id}
                      className="p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {formatDate(appointment.date)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {appointment.startTime} - {appointment.endTime}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {appointment.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Projets et Documents */}
          <div className="lg:col-span-2 space-y-6">
            {/* Projets */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Projets</h2>
                <Link href="/projets" className="text-sm text-primary-600 hover:underline">
                  Voir tout
                </Link>
              </div>
              <div className="space-y-3">
                {projects.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    href={`/projets/${project.id}`}
                    className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{project.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(project.startDate)} • {
                            project.type === 'recherche_fuite' && 'Recherche de fuite'
                          }
                          {project.type === 'reparation_lourde' && 'Réparation lourde'}
                          {project.type === 'renovation_salle_bain' && 'Rénovation salle de bain'}
                        </p>
                        {project.amount && project.amount > 0 && (
                          <p className="text-xs font-medium text-primary-600 mt-1">
                            {formatCurrency(project.amount)}
                            {!project.hasInvoice && (
                              <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                                Sans facture
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          project.status === 'termine'
                            ? 'bg-green-100 text-green-700'
                            : project.status === 'en_cours'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {project.status === 'termine' && 'Terminé'}
                        {project.status === 'en_cours' && 'En cours'}
                        {project.status === 'en_attente' && 'En attente'}
                        {project.status === 'en_pause' && 'En pause'}
                        {project.status === 'annule' && 'Annulé'}
                      </span>
                    </div>
                  </Link>
                ))}
                {projects.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Aucun projet pour ce client
                  </p>
                )}
              </div>
            </div>

            {/* Documents */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Documents</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowDocumentModal(true)}
                    className="btn btn-primary btn-sm flex items-center space-x-1"
                  >
                    <Plus size={16} />
                    <span>Créer</span>
                  </button>
                  <Link href="/documents" className="text-sm text-primary-600 hover:underline">
                    Voir tout
                  </Link>
                </div>
              </div>
              <div className="space-y-3">
                {documents.slice(0, 5).map((document) => (
                  <Link
                    key={document.id}
                    href={`/documents/${document.id}`}
                    className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {document.type === 'facture' && 'Facture'}
                          {document.type === 'devis' && 'Devis'}
                          {document.type === 'bon_commande' && 'Bon de commande'} {document.number}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(document.date)} • {formatCurrency(document.total)}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          document.status === 'paye'
                            ? 'bg-green-100 text-green-700'
                            : document.status === 'envoye'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {document.status === 'paye' && 'Payé'}
                        {document.status === 'envoye' && 'Envoyé'}
                        {document.status === 'brouillon' && 'Brouillon'}
                        {document.status === 'annule' && 'Annulé'}
                      </span>
                    </div>
                  </Link>
                ))}
                {documents.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Aucun document pour ce client
                  </p>
                )}
              </div>
            </div>

            {/* Dépannages */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Dépannages</h2>
                <button
                  onClick={() => { setEditingRevenue(null); setShowRevenueModal(true); }}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <Plus size={20} />
                  <span>Ajouter un dépannage</span>
                </button>
              </div>
              <div className="space-y-3">
                {manualRevenues.map((revenue) => {
                  const plombier = revenue.plombierId ? allPlombiers.find(p => p.id === revenue.plombierId) : null;
                  const plombierPercent = (revenue.plombierPercentage || 60) / 100;
                  const companyPercent = 1 - plombierPercent;
                  const plombierShare = revenue.amount * plombierPercent;
                  const companyShare = revenue.amount * companyPercent;
                  
                  return (
                    <div
                      key={revenue.id}
                      className="p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <p className="font-medium text-gray-900">
                              {formatCurrency(revenue.amount)}
                            </p>
                            {revenue.isBlackRevenue && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                                Sans facture
                              </span>
                            )}
                            {plombier && (
                              <button
                                onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, 'manualRevenues', revenue.id), {
                                      plombierHasPaid: !revenue.plombierHasPaid,
                                      updatedAt: Timestamp.now(),
                                    });
                                    loadClientData();
                                  } catch (error) {
                                    console.error('Error updating payment status:', error);
                                    alert('Erreur lors de la mise à jour');
                                  }
                                }}
                                className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                                  revenue.plombierHasPaid
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                title={`${revenue.plombierHasPaid ? 'Marquer comme non payé' : 'Marquer comme payé'}: ${plombier.name} - ${formatCurrency(companyShare)}`}
                              >
                                <span>{plombier.name}</span>
                                <span className={revenue.plombierHasPaid ? 'text-green-600' : 'text-gray-500'}>
                                  {revenue.plombierHasPaid ? '✓' : '○'}
                                </span>
                              </button>
                            )}
                            {plombier && revenue.plombierHasPaid && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                Payé
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{revenue.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(revenue.date)}
                            {revenue.projectId && (
                              <span> • Projet lié</span>
                            )}
                            {plombier && (
                              <span> • {plombier.name}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => { setEditingRevenue(revenue); setShowRevenueModal(true); }}
                            className="p-1 text-gray-600 hover:text-primary-600"
                            title="Modifier"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Supprimer ce dépannage ? Il ne sera plus affiché ni compté dans les commandes.')) {
                                try {
                                  await updateDoc(doc(db, 'manualRevenues', revenue.id), {
                                    deleted: true,
                                    updatedAt: Timestamp.now(),
                                  });
                                  loadClientData();
                                } catch (error) {
                                  console.error('Error deleting revenue:', error);
                                  alert('Erreur lors de la suppression');
                                }
                              }
                            }}
                            className="p-1 text-gray-600 hover:text-red-600"
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {manualRevenues.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Aucun dépannage enregistré
                  </p>
                )}
              </div>
            </div>

            {/* Codes promo */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Codes promo</h2>
                <button
                  onClick={() => {
                    setPromoFormData({
                      code: '',
                      label: '',
                      discountType: 'percent',
                      discountValue: 10,
                      expiresAt: '',
                    });
                    setShowPromoModal(true);
                  }}
                  className="btn btn-primary btn-sm flex items-center gap-1"
                >
                  <Tag size={16} />
                  <span>Activer un code</span>
                </button>
              </div>
              <div className="space-y-3">
                {clientPromoCodes.map((p) => (
                  <div
                    key={p.id}
                    className={`p-3 border rounded-lg flex items-center justify-between ${
                      p.used ? 'bg-gray-50 border-gray-200' : 'border-primary-200 bg-primary-50/50'
                    }`}
                  >
                    <div>
                      <span className="font-mono font-semibold text-primary-700">{p.code}</span>
                      <span className="mx-2">•</span>
                      <span className="text-sm text-gray-700">{p.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {p.discountType === 'percent'
                          ? `${p.discountValue}% de réduction`
                          : `${p.discountValue} MAD de réduction`}
                        {p.used && ' • Utilisé'}
                        {p.expiresAt && !p.used && ` • Expire le ${formatDate(p.expiresAt)}`}
                      </p>
                    </div>
                  </div>
                ))}
                {clientPromoCodes.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Aucun code promo activé
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal pour ajouter un dépannage */}
      {showRevenueModal && (
        <RevenueModal
          clientId={clientId}
          projects={projects}
          plombiers={allPlombiers.filter(isPlombierAssignable)}
          editingRevenue={editingRevenue}
          onClose={() => { setShowRevenueModal(false); setEditingRevenue(null); }}
          onSave={loadClientData}
        />
      )}

      {/* Modal pour créer un document */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Créer un document</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de document *
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as 'facture' | 'devis' | 'bon_commande')}
                    className="input"
                  >
                    <option value="devis">Devis</option>
                    <option value="facture">Facture</option>
                    <option value="bon_commande">Bon de commande</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDocumentModal(false)}
                    className="btn btn-secondary"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/documents?clientId=${clientId}&type=${documentType}`);
                      setShowDocumentModal(false);
                    }}
                    className="btn btn-primary"
                  >
                    Créer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour envoyer un email */}
      {showEmailModal && client?.email && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Envoyer un email</h2>
              
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSendingEmail(true);
                  try {
                    const response = await fetch('/api/client/send-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        to: client.email,
                        subject: emailData.subject,
                        message: emailData.message,
                        clientName: client.name,
                      }),
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                      alert('Email envoyé avec succès !');
                      setShowEmailModal(false);
                      setEmailData({ subject: '', message: '' });
                    } else {
                      alert(`Erreur: ${result.error}`);
                    }
                  } catch (error: any) {
                    console.error('Error sending email:', error);
                    alert('Erreur lors de l\'envoi de l\'email');
                  } finally {
                    setSendingEmail(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destinataire
                  </label>
                  <input
                    type="email"
                    value={client.email}
                    disabled
                    className="input bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sujet *
                  </label>
                  <input
                    type="text"
                    required
                    value={emailData.subject}
                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                    className="input"
                    placeholder="Sujet de l'email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    value={emailData.message}
                    onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                    className="input"
                    rows={10}
                    placeholder="Votre message..."
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailModal(false);
                      setEmailData({ subject: '', message: '' });
                    }}
                    className="btn btn-secondary"
                    disabled={sendingEmail}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex items-center space-x-2"
                    disabled={sendingEmail}
                  >
                    {sendingEmail ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Envoi...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>Envoyer</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour envoyer un SMS */}
      {showSmsModal && client?.phone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Envoyer un SMS</h2>
              
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSendingSms(true);
                  try {
                    const response = await fetch('/api/client/send-sms', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        phone: client.phone,
                        message: smsData.message,
                      }),
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                      if (result.whatsappUrl) {
                        // Ouvrir WhatsApp Web dans un nouvel onglet
                        window.open(result.whatsappUrl, '_blank');
                        alert('WhatsApp Web ouvert dans un nouvel onglet. Pour envoyer de vrais SMS, configurez Infobip dans les variables d\'environnement.');
                      } else {
                        alert('SMS envoyé avec succès !');
                      }
                      setShowSmsModal(false);
                      setSmsData({ message: '' });
                    } else {
                      alert(`Erreur: ${result.error}`);
                    }
                  } catch (error: any) {
                    console.error('Error sending SMS:', error);
                    alert('Erreur lors de l\'envoi du SMS');
                  } finally {
                    setSendingSms(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destinataire
                  </label>
                  <input
                    type="tel"
                    value={client.phone}
                    disabled
                    className="input bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Note: Si Infobip n&apos;est pas configuré, WhatsApp Web sera ouvert
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    value={smsData.message}
                    onChange={(e) => setSmsData({ message: e.target.value })}
                    className="input"
                    rows={8}
                    placeholder="Votre message SMS..."
                    maxLength={160}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {smsData.message.length}/160 caractères
                  </p>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSmsModal(false);
                      setSmsData({ message: '' });
                    }}
                    className="btn btn-secondary"
                    disabled={sendingSms}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex items-center space-x-2"
                    disabled={sendingSms}
                  >
                    {sendingSms ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Envoi...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>Envoyer</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour activer un code promo */}
      {showPromoModal && user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Activer un code promo</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await addDoc(collection(db, 'clientPromoCodes'), {
                    clientId,
                    code: promoFormData.code.trim().toUpperCase(),
                    label: promoFormData.label.trim(),
                    discountType: promoFormData.discountType,
                    discountValue: promoFormData.discountValue,
                    activatedByAdminId: user.id,
                    activatedAt: Timestamp.now(),
                    expiresAt: promoFormData.expiresAt
                      ? Timestamp.fromDate(new Date(promoFormData.expiresAt))
                      : null,
                    used: false,
                  });
                  await loadClientData();
                  setShowPromoModal(false);
                } catch (err: any) {
                  alert(err?.message || 'Erreur lors de l\'activation.');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  type="text"
                  required
                  value={promoFormData.code}
                  onChange={(e) => setPromoFormData((p) => ({ ...p, code: e.target.value }))}
                  placeholder="ex: PROMO10"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Libellé</label>
                <input
                  type="text"
                  required
                  value={promoFormData.label}
                  onChange={(e) => setPromoFormData((p) => ({ ...p, label: e.target.value }))}
                  placeholder="ex: 10% de réduction"
                  className="input w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={promoFormData.discountType}
                    onChange={(e) =>
                      setPromoFormData((p) => ({ ...p, discountType: e.target.value as 'percent' | 'fixed' }))
                    }
                    className="input w-full"
                  >
                    <option value="percent">Pourcentage</option>
                    <option value="fixed">Montant fixe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valeur</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={promoFormData.discountType === 'percent' ? 100 : undefined}
                    value={promoFormData.discountValue}
                    onChange={(e) =>
                      setPromoFormData((p) => ({ ...p, discountValue: Number(e.target.value) }))
                    }
                    className="input w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d&apos;expiration (optionnel)</label>
                <input
                  type="date"
                  value={promoFormData.expiresAt}
                  onChange={(e) => setPromoFormData((p) => ({ ...p, expiresAt: e.target.value }))}
                  className="input w-full"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Activer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

// Composant modal pour ajouter ou modifier un dépannage
function RevenueModal({
  clientId,
  projects,
  plombiers,
  editingRevenue,
  onClose,
  onSave,
}: {
  clientId: string;
  projects: Project[];
  plombiers: User[];
  editingRevenue: ManualRevenue | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!editingRevenue;
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    projectId: '',
    plombierId: '',
    avecFacture: true,
    plombierPercentage: 60,
    notes: '',
  });

  useEffect(() => {
    if (editingRevenue) {
      const d = editingRevenue.date;
      const dateObj = d instanceof Date ? d : (d as { toDate?: () => Date })?.toDate?.() ?? new Date();
      const dateStr = dateObj.toISOString().split('T')[0];
      setFormData({
        amount: String(editingRevenue.amount),
        date: dateStr,
        description: editingRevenue.description || '',
        projectId: editingRevenue.projectId || '',
        plombierId: editingRevenue.plombierId || '',
        avecFacture: !editingRevenue.isBlackRevenue,
        plombierPercentage: editingRevenue.plombierPercentage || 60,
        notes: editingRevenue.notes || '',
      });
    } else {
      setFormData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        projectId: '',
        plombierId: '',
        avecFacture: true,
        plombierPercentage: 60,
        notes: '',
      });
    }
  }, [editingRevenue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const revenueData = {
        amount: parseFloat(formData.amount),
        date: Timestamp.fromDate(new Date(formData.date)),
        description: formData.description,
        projectId: formData.projectId || null,
        plombierId: formData.plombierId || null,
        isBlackRevenue: !formData.avecFacture,
        plombierPercentage: formData.plombierPercentage || 60,
        notes: formData.notes || '',
        updatedAt: Timestamp.now(),
      };
      if (editingRevenue) {
        await updateDoc(doc(db, 'manualRevenues', editingRevenue.id), revenueData);
      } else {
        await addDoc(collection(db, 'manualRevenues'), {
          ...revenueData,
          clientId,
          createdAt: Timestamp.now(),
        });
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving revenue:', error);
      if (error.code === 'permission-denied') {
        alert('Erreur de permissions. Veuillez vérifier que les règles Firestore incluent la collection "manualRevenues" (dépannages). Consultez FIRESTORE_RULES_COMPLETE.md');
      } else {
        alert(`Erreur lors de la sauvegarde: ${error.message || 'Erreur inconnue'}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{isEdit ? 'Modifier le dépannage' : 'Ajouter un dépannage'}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant (DH) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="input"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                placeholder="Ex: Intervention réparation..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Projet lié (optionnel)
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="input"
                >
                  <option value="">Aucun projet</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plombier (optionnel)
                </label>
                <select
                  value={formData.plombierId}
                  onChange={(e) => setFormData({ ...formData, plombierId: e.target.value })}
                  className="input"
                >
                  <option value="">Aucun</option>
                  {plombiers.map((plombier) => (
                    <option key={plombier.id} value={plombier.id}>
                      {plombier.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="avecFacture"
                  checked={formData.avecFacture}
                  onChange={(e) => setFormData({ ...formData, avecFacture: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="avecFacture" className="text-sm text-gray-700">
                  Avec facture
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  % Plombier (défaut: 60%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.plombierPercentage}
                  onChange={(e) => setFormData({ ...formData, plombierPercentage: parseInt(e.target.value) || 60 })}
                  className="input"
                  placeholder="60"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Société: {100 - (formData.plombierPercentage || 60)}%
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
