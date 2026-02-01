'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Client, User } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Plus, Edit, Trash2, Phone, Mail, MapPin, Users, Search, ChevronUp, ChevronDown, Eye } from 'lucide-react';

type SortField = 'name' | 'totalRevenue' | 'totalProjects' | 'city' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export default function ClientsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<(Client & { _stats?: { totalRevenue: number; totalProjects: number; totalInvoices: number; plombierRevenue: number; companyRevenue: number } })[]>([]);
  const [plombiers, setPlombiers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    notes: '',
    companyName: '',
    ice: '',
    clientType: 'particulier' as 'particulier' | 'professionnel',
    assignedPlombierId: '',
  });
  
  // Action rapide lors de la création
  const [actionType, setActionType] = useState<'none' | 'depannage' | 'projet'>('none');
  const [actionData, setActionData] = useState({
    plombierId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    amount: '',
    description: '',
    isUrgent: false,
    projectType: 'recherche_fuite' as 'recherche_fuite' | 'reparation_lourde' | 'renovation_salle_bain',
    projectTitle: '',
    projectDescription: '',
  });
  
  // Filtres et recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlombier, setFilterPlombier] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'particulier' | 'professionnel'>('all');
  
  // Tri
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadClients();
    }
  }, [user, authLoading, router]);

  const loadClients = async () => {
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

      // Charger les clients avec leurs statistiques
      const querySnapshot = await getDocs(collection(db, 'clients'));
      const clientsData = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          try {
            const clientData = {
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate() || new Date(),
              updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            } as Client;

            // Calculer les stats pour chaque client
            const projectsQuery = query(
              collection(db, 'projects'),
              where('clientId', '==', doc.id)
            );
            const documentsQuery = query(
              collection(db, 'documents'),
              where('clientId', '==', doc.id)
            );
            const revenuesQuery = query(
              collection(db, 'manualRevenues'),
              where('clientId', '==', doc.id)
            );
            
            const [projectsSnapshot, documentsSnapshot, revenuesSnapshot] = await Promise.all([
              getDocs(projectsQuery).catch(() => ({ docs: [], size: 0 })),
              getDocs(documentsQuery).catch(() => ({ docs: [], size: 0 })),
              getDocs(revenuesQuery).catch(() => ({ docs: [], size: 0 })),
            ]);

            // Calculer les revenus avec pourcentages personnalisés
            let totalPlombierShare = 0;
            let totalCompanyShare = 0;
            
            // Revenus des projets (avec pourcentage personnalisé)
            const projectsData = projectsSnapshot.docs.map(d => d.data());
            projectsData.forEach(project => {
              if (project.amount && project.amount > 0) {
                const plombierPercent = (project.plombierPercentage || 60) / 100;
                const companyPercent = 1 - plombierPercent;
                totalPlombierShare += project.amount * plombierPercent;
                totalCompanyShare += project.amount * companyPercent;
              }
            });

            // Revenus des factures payées (utiliser pourcentage du projet lié ou 60% par défaut)
            const paidInvoices = documentsSnapshot.docs
              .map(d => d.data())
              .filter(d => d.type === 'facture' && d.status === 'paye');
            paidInvoices.forEach(invoice => {
              const relatedProject = projectsData.find(p => p.clientId === invoice.clientId);
              const plombierPercent = relatedProject ? (relatedProject.plombierPercentage || 60) / 100 : 0.6;
              const companyPercent = 1 - plombierPercent;
              totalPlombierShare += (invoice.total || 0) * plombierPercent;
              totalCompanyShare += (invoice.total || 0) * companyPercent;
            });

            // Dépannages (avec pourcentage personnalisé)
            const revenuesData = revenuesSnapshot.docs.map(d => d.data());
            revenuesData.forEach(revenue => {
              const plombierPercent = (revenue.plombierPercentage || 60) / 100;
              const companyPercent = 1 - plombierPercent;
              totalPlombierShare += revenue.amount * plombierPercent;
              totalCompanyShare += revenue.amount * companyPercent;
            });
            
            // Total = part plombier + part société
            const totalRevenue = totalPlombierShare + totalCompanyShare;

            return {
              ...clientData,
              _stats: {
                totalRevenue,
                totalProjects: projectsSnapshot.size || 0,
                totalInvoices: documentsSnapshot.size || 0,
                plombierRevenue: totalPlombierShare,
                companyRevenue: totalCompanyShare,
              },
            };
          } catch (error) {
            console.error(`Error loading stats for client ${doc.id}:`, error);
            // Retourner le client sans stats en cas d'erreur
            const clientData = {
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate() || new Date(),
              updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            } as Client;
            return {
              ...clientData,
              _stats: {
                totalRevenue: 0,
                totalProjects: 0,
                totalInvoices: 0,
                plombierRevenue: 0,
                companyRevenue: 0,
              },
            };
          }
        })
      );
      
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'clients/page.tsx:163',message:'handleSubmit called',data:{actionType,isEditing:!!editingClient,hasPlombier:!!actionData.plombierId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      const clientData = {
        ...formData,
        createdAt: editingClient ? editingClient.createdAt : Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      let clientId: string;
      
      if (editingClient) {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'clients/page.tsx:175',message:'Updating existing client',data:{clientId:editingClient.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        await updateDoc(doc(db, 'clients', editingClient.id), clientData);
        clientId = editingClient.id;
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'clients/page.tsx:180',message:'Creating new client',data:{clientName:formData.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        const clientRef = await addDoc(collection(db, 'clients'), clientData);
        clientId = clientRef.id;
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'clients/page.tsx:183',message:'Client created successfully',data:{clientId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      }

      // Si une action est demandée et qu'on crée un nouveau client (pas en édition)
      if (!editingClient && actionType !== 'none' && actionData.plombierId) {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'clients/page.tsx:189',message:'Creating action',data:{actionType,plombierId:actionData.plombierId,date:actionData.date},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        if (actionType === 'depannage') {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'clients/page.tsx:192',message:'Creating depannage revenue',data:{amount:actionData.amount,description:actionData.description},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          // Créer un dépannage (revenu sans facture)
          const revenueRef = await addDoc(collection(db, 'manualRevenues'), {
            clientId,
            amount: parseFloat(actionData.amount) || 0,
            date: Timestamp.fromDate(new Date(actionData.date)),
            description: actionData.description || `Dépannage/Urgence - ${formData.name}`,
            plombierId: actionData.plombierId,
            isBlackRevenue: false,
            notes: actionData.isUrgent ? 'URGENT' : '',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'clients/page.tsx:203',message:'Manual revenue created',data:{revenueId:revenueRef.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion

          // Ajouter au planning du plombier
          const planningRef = await addDoc(collection(db, 'planning'), {
            plombierId: actionData.plombierId,
            date: Timestamp.fromDate(new Date(actionData.date)),
            startTime: actionData.startTime,
            endTime: actionData.endTime,
            type: 'project',
            notes: `Dépannage: ${formData.name} - ${actionData.description}`,
            createdAt: Timestamp.now(),
          });
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'clients/page.tsx:213',message:'Planning entry created for depannage',data:{planningId:planningRef.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion

        } else if (actionType === 'projet') {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'clients/page.tsx:217',message:'Creating project',data:{projectType:actionData.projectType,title:actionData.projectTitle},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          // Créer un projet
          const projectRef = await addDoc(collection(db, 'projects'), {
            clientId,
            type: actionData.projectType,
            title: actionData.projectTitle || `${actionData.projectType} - ${formData.name}`,
            description: actionData.projectDescription,
            status: 'en_attente',
            startDate: Timestamp.fromDate(new Date(actionData.date)),
            estimatedDuration: 1,
            teamLeaderId: actionData.plombierId,
            plombierIds: [actionData.plombierId],
            progress: 0,
            progressStatus: 'non_commence',
            address: formData.address,
            amount: actionData.amount ? parseFloat(actionData.amount) : null,
            hasInvoice: false,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'clients/page.tsx:234',message:'Project created successfully',data:{projectId:projectRef.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion

          // Ajouter au planning du plombier
          const planningRef = await addDoc(collection(db, 'planning'), {
            plombierId: actionData.plombierId,
            projectId: projectRef.id,
            date: Timestamp.fromDate(new Date(actionData.date)),
            startTime: actionData.startTime,
            endTime: actionData.endTime,
            type: 'project',
            notes: actionData.projectDescription,
            createdAt: Timestamp.now(),
          });
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'clients/page.tsx:245',message:'Planning entry created for project',data:{planningId:planningRef.id,projectId:projectRef.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
        }
      }

      setShowModal(false);
      setEditingClient(null);
      resetForm();
      loadClients();
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'clients/page.tsx:253',message:'handleSubmit completed successfully',data:{clientId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'clients/page.tsx:256',message:'Error in handleSubmit',data:{error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error('Error saving client:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone,
      address: client.address,
      city: client.city,
      postalCode: client.postalCode,
      notes: client.notes || '',
      companyName: client.companyName || '',
      ice: client.ice || '',
      clientType: client.clientType || 'particulier',
      assignedPlombierId: client.assignedPlombierId || '',
    });
    // Réinitialiser l'action lors de l'édition (on ne crée pas d'action en édition)
    setActionType('none');
    setActionData({
      plombierId: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00',
      amount: '',
      description: '',
      isUrgent: false,
      projectType: 'recherche_fuite',
      projectTitle: '',
      projectDescription: '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postalCode: '',
      notes: '',
      companyName: '',
      ice: '',
      clientType: 'particulier',
      assignedPlombierId: '',
    });
    
    setActionType('none');
    setActionData({
      plombierId: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00',
      amount: '',
      description: '',
      isUrgent: false,
      projectType: 'recherche_fuite',
      projectTitle: '',
      projectDescription: '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;

    try {
      await deleteDoc(doc(db, 'clients', id));
      loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // Filtrer et trier les clients
  const filteredAndSortedClients = useMemo(() => {
    let filtered = [...clients];

    // Recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client => 
        client.name.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query) ||
        client.phone?.toLowerCase().includes(query) ||
        client.companyName?.toLowerCase().includes(query) ||
        client.city?.toLowerCase().includes(query) ||
        client.address?.toLowerCase().includes(query)
      );
    }

    // Filtre par plombier
    if (filterPlombier) {
      filtered = filtered.filter(client => client.assignedPlombierId === filterPlombier);
    }

    // Filtre par type
    if (filterType !== 'all') {
      filtered = filtered.filter(client => client.clientType === filterType);
    }

    // Tri
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'totalRevenue':
          aValue = a._stats?.totalRevenue || 0;
          bValue = b._stats?.totalRevenue || 0;
          break;
        case 'totalProjects':
          aValue = a._stats?.totalProjects || 0;
          bValue = b._stats?.totalProjects || 0;
          break;
        case 'city':
          aValue = (a.city || '').toLowerCase();
          bValue = (b.city || '').toLowerCase();
          break;
        case 'createdAt':
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [clients, searchQuery, filterPlombier, filterType, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Clients</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
              {filteredAndSortedClients.length} client{filteredAndSortedClients.length > 1 ? 's' : ''} 
              {clients.length !== filteredAndSortedClients.length && ` sur ${clients.length}`}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingClient(null);
              setFormData({
                name: '',
                email: '',
                phone: '',
                address: '',
                city: '',
                postalCode: '',
                notes: '',
                companyName: '',
                ice: '',
                clientType: 'particulier',
                assignedPlombierId: '',
              });
              setActionType('none');
              setActionData({
                plombierId: '',
                date: new Date().toISOString().split('T')[0],
                startTime: '09:00',
                endTime: '17:00',
                amount: '',
                description: '',
                isUrgent: false,
                projectType: 'recherche_fuite',
                projectTitle: '',
                projectDescription: '',
              });
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Plus size={18} className="sm:w-5 sm:h-5" />
            <span>Nouveau client</span>
          </button>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="card p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Recherche */}
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 sm:w-5 sm:h-5" size={18} />
              <input
                type="text"
                placeholder="Rechercher (nom, email, téléphone...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Filtre par plombier */}
            <div>
              <select
                value={filterPlombier}
                onChange={(e) => setFilterPlombier(e.target.value)}
                className="input"
              >
                <option value="">Tous les plombiers</option>
                {plombiers.map((plombier) => (
                  <option key={plombier.id} value={plombier.id}>
                    {plombier.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre par type */}
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'particulier' | 'professionnel')}
                className="input"
              >
                <option value="all">Tous les types</option>
                <option value="particulier">Particuliers</option>
                <option value="professionnel">Professionnels</option>
              </select>
            </div>
          </div>

          {/* Reset filters */}
          {(searchQuery || filterPlombier || filterType !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterPlombier('');
                setFilterType('all');
              }}
              className="mt-3 text-sm text-primary-600 hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* Tableau des clients */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-2 sm:px-0">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('name')}>
                    <div className="flex items-center space-x-1">
                      <span>Client</span>
                      <SortIcon field="name" />
                    </div>
                  </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('city')}>
                      <div className="flex items-center space-x-1">
                        <span>Adresse</span>
                        <SortIcon field="city" />
                      </div>
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plombier
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('totalRevenue')}>
                      <div className="flex items-center space-x-1">
                        <span>Revenus</span>
                        <SortIcon field="totalRevenue" />
                      </div>
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('totalProjects')}>
                      <div className="flex items-center space-x-1">
                        <span>Projets</span>
                        <SortIcon field="totalProjects" />
                      </div>
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedClients.map((client) => {
                  const stats = client._stats || { totalRevenue: 0, totalProjects: 0, totalInvoices: 0 };
                  const assignedPlombier = client.assignedPlombierId 
                    ? plombiers.find(p => p.id === client.assignedPlombierId)
                    : null;

                  return (
                    <tr 
                      key={client.id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-gray-900">{client.name}</div>
                          {client.companyName && (
                            <div className="text-xs text-gray-500">{client.companyName}</div>
                          )}
                          <div className="mt-1">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                              client.clientType === 'professionnel' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {client.clientType === 'professionnel' ? 'Pro' : 'Particulier'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="text-xs sm:text-sm text-gray-900 space-y-1">
                          {client.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone size={12} className="sm:w-3.5 sm:h-3.5 text-gray-400" />
                              <span className="text-xs">{client.phone}</span>
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center space-x-1">
                              <Mail size={12} className="sm:w-3.5 sm:h-3.5 text-gray-400" />
                              <span className="text-xs truncate max-w-[150px] sm:max-w-none">{client.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="text-xs sm:text-sm text-gray-900">
                          <div className="flex items-start space-x-1">
                            <MapPin size={12} className="sm:w-3.5 sm:h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-xs">
                              {client.address && `${client.address}, `}
                              {client.postalCode && `${client.postalCode} `}
                              {client.city}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        {assignedPlombier ? (
                          <div className="flex items-center space-x-1 text-xs sm:text-sm text-primary-600">
                            <Users size={12} className="sm:w-3.5 sm:h-3.5" />
                            <span>{assignedPlombier.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">
                          {formatCurrency(stats.totalRevenue)}
                        </div>
                        {stats.totalRevenue > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            <div>Part plombier: {formatCurrency(client._stats?.plombierRevenue || 0)}</div>
                            <div>Part société: {formatCurrency(client._stats?.companyRevenue || 0)}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">
                          {stats.totalProjects}
                        </div>
                        <div className="text-xs text-gray-500">
                          {stats.totalInvoices} doc{stats.totalInvoices > 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => router.push(`/clients/${client.id}`)}
                            className="text-primary-600 hover:text-primary-800"
                            title="Voir détails"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(client)}
                            className="text-gray-600 hover:text-primary-600"
                            title="Modifier"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
                            className="text-gray-600 hover:text-red-600"
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>

          {filteredAndSortedClients.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {clients.length === 0 
                  ? 'Aucun client pour le moment' 
                  : 'Aucun client ne correspond aux filtres'}
              </p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {editingClient ? 'Modifier le client' : 'Nouveau client'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Téléphone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="input"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Code postal
                      </label>
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ville
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de client
                    </label>
                    <select
                      value={formData.clientType}
                      onChange={(e) => setFormData({ ...formData, clientType: e.target.value as 'particulier' | 'professionnel' })}
                      className="input"
                    >
                      <option value="particulier">Particulier</option>
                      <option value="professionnel">Professionnel</option>
                    </select>
                  </div>

                  {formData.clientType === 'professionnel' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nom de l&apos;entreprise
                        </label>
                        <input
                          type="text"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ICE
                        </label>
                        <input
                          type="text"
                          value={formData.ice}
                          onChange={(e) => setFormData({ ...formData, ice: e.target.value })}
                          className="input"
                          placeholder="003755962000004"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plombier assigné
                    </label>
                    <select
                      value={formData.assignedPlombierId}
                      onChange={(e) => setFormData({ ...formData, assignedPlombierId: e.target.value })}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="input"
                      rows={4}
                    />
                  </div>

                  {/* Section Action rapide - uniquement pour la création */}
                  {!editingClient && (
                    <>
                      <div className="pt-4 border-t border-gray-200 mt-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Créer une action immédiate (optionnel)
                        </h3>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Type d&apos;intervention
                          </label>
                          <select
                            value={actionType}
                            onChange={(e) => setActionType(e.target.value as 'none' | 'depannage' | 'projet')}
                            className="input"
                          >
                            <option value="none">Aucune action</option>
                            <option value="depannage">Dépannage / Urgence</option>
                            <option value="projet">Projet</option>
                          </select>
                        </div>

                        {actionType !== 'none' && (
                          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                            {/* Plombier assigné */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Plombier assigné *
                              </label>
                              <select
                                value={actionData.plombierId}
                                onChange={(e) => setActionData({ ...actionData, plombierId: e.target.value })}
                                className="input"
                                required
                              >
                                <option value="">Sélectionner un plombier</option>
                                {plombiers.map((plombier) => (
                                  <option key={plombier.id} value={plombier.id}>
                                    {plombier.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Date et heures */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Date *
                                </label>
                                <input
                                  type="date"
                                  value={actionData.date}
                                  onChange={(e) => setActionData({ ...actionData, date: e.target.value })}
                                  className="input"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Heure début
                                </label>
                                <input
                                  type="time"
                                  value={actionData.startTime}
                                  onChange={(e) => setActionData({ ...actionData, startTime: e.target.value })}
                                  className="input"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Heure fin
                                </label>
                                <input
                                  type="time"
                                  value={actionData.endTime}
                                  onChange={(e) => setActionData({ ...actionData, endTime: e.target.value })}
                                  className="input"
                                />
                              </div>
                            </div>

                            {/* Si dépannage */}
                            {actionType === 'depannage' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Montant (DH) *
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={actionData.amount}
                                    onChange={(e) => setActionData({ ...actionData, amount: e.target.value })}
                                    className="input"
                                    placeholder="0.00"
                                    required={actionType === 'depannage'}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                  </label>
                                  <textarea
                                    value={actionData.description}
                                    onChange={(e) => setActionData({ ...actionData, description: e.target.value })}
                                    className="input"
                                    rows={2}
                                    placeholder="Description du dépannage..."
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id="isUrgent"
                                    checked={actionData.isUrgent}
                                    onChange={(e) => setActionData({ ...actionData, isUrgent: e.target.checked })}
                                    className="rounded"
                                  />
                                  <label htmlFor="isUrgent" className="text-sm text-gray-700">
                                    Urgence
                                  </label>
                                </div>
                              </>
                            )}

                            {/* Si projet */}
                            {actionType === 'projet' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Type de projet *
                                  </label>
                                  <select
                                    value={actionData.projectType}
                                    onChange={(e) => setActionData({ ...actionData, projectType: e.target.value as 'recherche_fuite' | 'reparation_lourde' | 'renovation_salle_bain' })}
                                    className="input"
                                  >
                                    <option value="recherche_fuite">Recherche de fuite</option>
                                    <option value="reparation_lourde">Réparation lourde</option>
                                    <option value="renovation_salle_bain">Rénovation salle de bain</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Titre du projet
                                  </label>
                                  <input
                                    type="text"
                                    value={actionData.projectTitle}
                                    onChange={(e) => setActionData({ ...actionData, projectTitle: e.target.value })}
                                    className="input"
                                    placeholder="Ex: Réparation fuite cuisine"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                  </label>
                                  <textarea
                                    value={actionData.projectDescription}
                                    onChange={(e) => setActionData({ ...actionData, projectDescription: e.target.value })}
                                    className="input"
                                    rows={3}
                                    placeholder="Description détaillée du projet..."
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Montant estimé (DH)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={actionData.amount}
                                    onChange={(e) => setActionData({ ...actionData, amount: e.target.value })}
                                    className="input"
                                    placeholder="0.00"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingClient(null);
                        resetForm();
                      }}
                      className="btn btn-secondary"
                    >
                      Annuler
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingClient ? 'Modifier' : 'Créer'}
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
