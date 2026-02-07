'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Document, Client, Project, DocumentItem, ManualRevenue } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Plus, Edit, Trash2, FileText, Download, Mail, Eye } from 'lucide-react';
import Link from 'next/link';

function DocumentsContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [manualRevenues, setManualRevenues] = useState<ManualRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [formData, setFormData] = useState({
    type: 'devis' as Document['type'],
    projectId: '',
    manualRevenueId: '',
    clientId: '',
    number: '',
    date: '',
    dueDate: '',
    items: [] as DocumentItem[],
    subtotal: 0,
    tax: 0,
    total: 0,
    includeTax: true, // Par défaut, inclure la TVA
    status: 'brouillon' as Document['status'],
    notes: '',
    footerDescriptions: [] as string[],
    manualTotal: undefined as number | undefined,
  });
  const [currentItem, setCurrentItem] = useState({
    description: '',
    quantity: '',
    unitPrice: 0,
    unit: 'piece' as 'piece' | 'm2' | 'm' | 'm3' | 'kg' | 'heure' | 'jour' | 'unite',
    length: '',
    width: '',
    height: '',
    descriptionOnly: false,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadData();
      
      // Si des paramètres sont présents dans l'URL, ouvrir le modal automatiquement
      const clientIdFromUrl = searchParams?.get('clientId');
      const typeFromUrl = searchParams?.get('type');
      if (clientIdFromUrl || typeFromUrl) {
        setEditingDocument(null);
        resetForm();
        const clientId = clientIdFromUrl || '';
        const clientName = clientId ? clients.find(c => c.id === clientId)?.name || '' : '';
        setClientSearch(clientName);
        setShowClientDropdown(false);
        setFormData({ 
          type: (typeFromUrl as Document['type']) || 'devis',
          projectId: '',
          manualRevenueId: '',
          clientId: clientId,
          number: '',
          date: new Date().toISOString().split('T')[0],
          dueDate: '',
          items: [],
          subtotal: 0,
          tax: 0,
          total: 0,
          includeTax: true,
          status: 'brouillon',
          notes: '',
          footerDescriptions: [],
          manualTotal: undefined,
        });
        setShowModal(true);
        // Nettoyer l'URL après utilisation
        router.replace('/documents');
      }
    }
  }, [user, authLoading, router, searchParams]);

  const loadData = async () => {
    try {
      // Load documents
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

      // Load clients
      const clientsSnapshot = await getDocs(collection(db, 'clients'));
      const clientsData = clientsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Client[];
      setClients(clientsData);

      // Load projects
      const projectsQuery = query(collection(db, 'projects'));
      const projectsSnapshot = await getDocs(projectsQuery);
      const projectsData = projectsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Project[];
      setProjects(projectsData);

      // Load manual revenues
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
      
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents/page.tsx:loadData',message:'Data loaded',data:{projectsCount:projectsData.length,revenuesCount:revenuesData.length,clientsCount:clientsData.length,projects:projectsData.map(p=>({id:p.id,title:p.title,clientId:p.clientId})),revenues:revenuesData.map(r=>({id:r.id,clientId:r.clientId,amount:r.amount}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      console.log('📊 Données chargées:', {
        projets: projectsData.length,
        revenus: revenuesData.length,
        clients: clientsData.length,
        projets_détails: projectsData.map(p => ({ id: p.id, title: p.title, clientId: p.clientId })),
        revenus_détails: revenuesData.map(r => ({ id: r.id, clientId: r.clientId, amount: r.amount }))
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDocumentNumber = (type: Document['type']) => {
    const prefix = type === 'facture' ? 'FAC' : type === 'devis' ? 'DEV' : 'BC';
    const year = new Date().getFullYear();
    const count = documents.filter((d) => d.type === type).length + 1;
    return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
  };

  const addItem = () => {
    if (!currentItem.description.trim()) {
      alert('Veuillez remplir la description');
      return;
    }

    // Ligne descriptive sans prix : afficher "—" pour qté, prix unitaire, total
    if (currentItem.descriptionOnly) {
      const item: DocumentItem = {
        description: currentItem.description.trim(),
        quantity: 0,
        unitPrice: 0,
        total: 0,
        descriptionOnly: true,
      };
      const newItems = [...formData.items, item];
      const subtotal = newItems.reduce((sum, i) => sum + (i.descriptionOnly ? 0 : i.total), 0);
      const tax = formData.type === 'facture' || formData.type === 'bon_commande'
        ? subtotal * 0.2
        : (formData.type === 'devis' && formData.includeTax) ? subtotal * 0.2 : 0;
      const total = formData.manualTotal ?? (subtotal + tax);
      setFormData({ ...formData, items: newItems, subtotal, tax, total });
      setCurrentItem({ ...currentItem, description: '', descriptionOnly: false });
      return;
    }

    if (currentItem.unitPrice < 0) {
      alert('Veuillez remplir le prix unitaire (ou cocher "Ligne descriptive sans prix")');
      return;
    }

    // Calculer la quantité selon l'unité choisie
    let calculatedQuantity = typeof currentItem.quantity === 'string' 
      ? parseFloat(currentItem.quantity) || 0 
      : currentItem.quantity;
    let area: number | undefined;
    let calculatedQuantityFlag = false;

    if (currentItem.unit === 'm2') {
      // Pour m², utiliser directement la quantité saisie
      if (!calculatedQuantity || calculatedQuantity <= 0) {
        alert('Veuillez saisir une quantité en m²');
        return;
      }
    } else if (currentItem.unit === 'm') {
      // Pour m, utiliser la longueur si fournie
      if (currentItem.length) {
        const length = parseFloat(currentItem.length);
        if (length > 0) {
          calculatedQuantity = length;
          calculatedQuantityFlag = true;
        }
      }
      if (calculatedQuantity <= 0) {
        alert('Veuillez saisir la longueur en mètres');
        return;
      }
    } else if (currentItem.unit === 'm3') {
      // Pour m³, calculer à partir de longueur × largeur × hauteur
      if (currentItem.length && currentItem.width && currentItem.height) {
        const length = parseFloat(currentItem.length);
        const width = parseFloat(currentItem.width);
        const height = parseFloat(currentItem.height);
        if (length > 0 && width > 0 && height > 0) {
          calculatedQuantity = length * width * height;
          calculatedQuantityFlag = true;
        }
      }
      if (calculatedQuantity <= 0) {
        alert('Veuillez saisir la longueur, largeur et hauteur pour calculer le volume en m³');
        return;
      }
    } else {
      // Pour les autres unités (pièce, kg, heure, jour, unité), utiliser la quantité saisie
      const qty = typeof currentItem.quantity === 'string' 
        ? parseFloat(currentItem.quantity) 
        : currentItem.quantity;
      if (!qty || qty <= 0) {
        alert('Veuillez saisir une quantité valide');
        return;
      }
      calculatedQuantity = qty;
    }

    const item: DocumentItem = {
      description: currentItem.description,
      quantity: calculatedQuantity,
      unitPrice: currentItem.unitPrice,
      total: calculatedQuantity * currentItem.unitPrice,
      unit: currentItem.unit,
      length: currentItem.length ? parseFloat(currentItem.length) : undefined,
      width: currentItem.width ? parseFloat(currentItem.width) : undefined,
      height: currentItem.height ? parseFloat(currentItem.height) : undefined,
      area: area,
      calculatedQuantity: calculatedQuantityFlag,
    };

    const newItems = [...formData.items, item];
    const subtotal = newItems.reduce((sum, i) => sum + (i.descriptionOnly ? 0 : i.total), 0);
    const tax = formData.type === 'facture' || formData.type === 'bon_commande' 
      ? subtotal * 0.2 
      : (formData.type === 'devis' && formData.includeTax) 
        ? subtotal * 0.2 
        : 0;
    const total = formData.manualTotal ?? (subtotal + tax);

    setFormData({
      ...formData,
      items: newItems,
      subtotal,
      tax,
      total,
    });

    setCurrentItem({
      description: '',
      quantity: '',
      unitPrice: 0,
      unit: 'piece',
      length: '',
      width: '',
      height: '',
      descriptionOnly: false,
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    const subtotal = newItems.reduce((sum, i) => sum + (i.descriptionOnly ? 0 : i.total), 0);
    const tax = formData.type === 'facture' || formData.type === 'bon_commande' 
      ? subtotal * 0.2 
      : (formData.type === 'devis' && formData.includeTax) 
        ? subtotal * 0.2 
        : 0;
    const total = formData.manualTotal ?? (subtotal + tax);

    setFormData({
      ...formData,
      items: newItems,
      subtotal,
      tax,
      total,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation : pour une facture, il faut un projet OU un dépannage
    if (formData.type === 'facture' && !formData.projectId && !formData.manualRevenueId) {
      alert('Une facture doit être liée à un projet ou à un dépannage');
      return;
    }
    
    try {
      // Nettoyer les items pour supprimer les champs undefined (Firestore ne les accepte pas)
      const cleanedItems = formData.items.map(item => {
        const cleanedItem: any = {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        };
        
        // Ajouter les champs optionnels seulement s'ils ne sont pas undefined
        if (item.unit !== undefined) cleanedItem.unit = item.unit;
        if (item.length !== undefined) cleanedItem.length = item.length;
        if (item.width !== undefined) cleanedItem.width = item.width;
        if (item.height !== undefined) cleanedItem.height = item.height;
        if (item.area !== undefined) cleanedItem.area = item.area;
        if (item.calculatedQuantity !== undefined) cleanedItem.calculatedQuantity = item.calculatedQuantity;
        if (item.descriptionOnly) cleanedItem.descriptionOnly = true;
        return cleanedItem;
      });

      const totalToSave = formData.manualTotal ?? formData.total;
      const documentData = {
        ...formData,
        items: cleanedItems,
        total: totalToSave,
        footerDescriptions: formData.footerDescriptions?.length ? formData.footerDescriptions : undefined,
        manualTotal: formData.manualTotal,
        projectId: formData.projectId || null,
        manualRevenueId: formData.manualRevenueId || null,
        number: formData.number || generateDocumentNumber(formData.type),
        date: Timestamp.fromDate(new Date(formData.date || new Date())),
        dueDate: formData.dueDate ? Timestamp.fromDate(new Date(formData.dueDate)) : null,
        // includeTax uniquement pour les devis, omettre pour les autres types
        ...(formData.type === 'devis' ? { includeTax: formData.includeTax ?? true } : {}),
        createdAt: editingDocument ? editingDocument.createdAt : Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (editingDocument) {
        await updateDoc(doc(db, 'documents', editingDocument.id), documentData);
      } else {
        await addDoc(collection(db, 'documents'), documentData);
      }

      setShowModal(false);
      setEditingDocument(null);
      setClientSearch('');
      setShowClientDropdown(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving document:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (document: Document) => {
    setEditingDocument(document);
    const subtotal = document.items.reduce((sum, i) => sum + (i.descriptionOnly ? 0 : i.total), 0);
    let tax = document.tax;
    // Si c'est une facture ou bon de commande sans TVA, la recalculer à 20%
    if ((document.type === 'facture' || document.type === 'bon_commande') && tax === 0 && subtotal > 0) {
      tax = subtotal * 0.2;
    }
    const total = subtotal + tax;
    
    const clientName = getClientName(document.clientId);
    setClientSearch(clientName !== 'Client inconnu' ? clientName : '');
    setShowClientDropdown(false);
    
    setFormData({
      type: document.type,
      projectId: document.projectId || '',
      manualRevenueId: document.manualRevenueId || '',
      clientId: document.clientId,
      number: document.number,
      date: formatDate(document.date).split('/').reverse().join('-'),
      dueDate: document.dueDate ? formatDate(document.dueDate).split('/').reverse().join('-') : '',
      items: document.items,
      subtotal,
      tax,
      total,
      includeTax: document.includeTax !== undefined ? document.includeTax : true,
      status: document.status,
      notes: document.notes || '',
      footerDescriptions: document.footerDescriptions ?? [],
      manualTotal: document.manualTotal,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      await deleteDoc(doc(db, 'documents', id));
      loadData();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'devis',
      projectId: '',
      manualRevenueId: '',
      clientId: '',
      number: '',
      date: '',
      dueDate: '',
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      includeTax: true,
      status: 'brouillon',
      notes: '',
      footerDescriptions: [],
      manualTotal: undefined,
    });
    setClientSearch('');
    setShowClientDropdown(false);
    setCurrentItem({
      description: '',
      quantity: '',
      unitPrice: 0,
      unit: 'piece',
      length: '',
      width: '',
      height: '',
      descriptionOnly: false,
    });
  };

  const getClientName = (clientId: string) => {
    return clients.find((c) => c.id === clientId)?.name || 'Client inconnu';
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return '';
    return projects.find((p) => p.id === projectId)?.title || 'Projet inconnu';
  };

  const filteredDocuments =
    filterType === 'all'
      ? documents
      : documents.filter((d) => d.type === filterType);

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Documents</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Factures, devis et bons de commande</p>
          </div>
          <button
            onClick={() => {
              setEditingDocument(null);
              resetForm();
              setFormData({ ...formData, date: new Date().toISOString().split('T')[0] });
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Plus size={18} className="sm:w-5 sm:h-5" />
            <span>Nouveau document</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 sm:gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setFilterType('facture')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              filterType === 'facture'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Factures
          </button>
          <button
            onClick={() => setFilterType('devis')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              filterType === 'devis'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Devis
          </button>
          <button
            onClick={() => setFilterType('bon_commande')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              filterType === 'bon_commande'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Bons de commande
          </button>
        </div>

        {/* Documents List */}
        <div className="card overflow-x-auto -mx-2 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-2 sm:px-0">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-700">Type</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-700">Numéro</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-700">Client</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-700">Date</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-700">Montant</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-700">Statut</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((document) => (
                  <tr key={document.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        document.type === 'facture'
                          ? 'bg-blue-100 text-blue-700'
                          : document.type === 'devis'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {document.type === 'facture' && 'Facture'}
                      {document.type === 'devis' && 'Devis'}
                      {document.type === 'bon_commande' && 'Bon de commande'}
                    </span>
                  </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-900">{document.number}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600 truncate max-w-[120px] sm:max-w-none">{getClientName(document.clientId)}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600">{formatDate(document.date)}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-900">{formatCurrency(document.total)}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        document.status === 'paye'
                          ? 'bg-green-100 text-green-700'
                          : document.status === 'envoye'
                          ? 'bg-blue-100 text-blue-700'
                          : document.status === 'annule'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {document.status === 'paye' && 'Payé'}
                      {document.status === 'envoye' && 'Envoyé'}
                      {document.status === 'annule' && 'Annulé'}
                      {document.status === 'brouillon' && 'Brouillon'}
                    </span>
                  </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <Link
                          href={`/documents/${document.id}`}
                          className="p-1 text-gray-600 hover:text-primary-600"
                          title="Voir / Imprimer"
                        >
                          <Eye size={14} className="sm:w-[18px] sm:h-[18px]" />
                        </Link>
                        <button
                          onClick={() => handleEdit(document)}
                          className="p-1 text-gray-600 hover:text-primary-600"
                          title="Modifier"
                        >
                          <Edit size={14} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                        <button
                          onClick={() => handleDelete(document.id)}
                          className="p-1 text-gray-600 hover:text-red-600"
                          title="Supprimer"
                        >
                          <Trash2 size={14} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredDocuments.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucun document pour le moment</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {editingDocument ? 'Modifier le document' : 'Nouveau document'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type de document *
                      </label>
                      <select
                        required
                        value={formData.type}
                        onChange={(e) => {
                          const newType = e.target.value as Document['type'];
                          const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
                          // Recalculer la TVA selon le nouveau type : toujours 20% pour factures et bons de commande
                          const tax = newType === 'facture' || newType === 'bon_commande' 
                            ? subtotal * 0.2 
                            : (newType === 'devis' && formData.includeTax) 
                              ? subtotal * 0.2 
                              : 0;
                          const total = subtotal + tax;
                          setFormData({ 
                            ...formData, 
                            type: newType,
                            tax,
                            total,
                            // Réinitialiser includeTax si on passe à un devis
                            includeTax: newType === 'devis' ? formData.includeTax : true
                          });
                        }}
                        className="input"
                      >
                        <option value="facture">Facture</option>
                        <option value="devis">Devis</option>
                        <option value="bon_commande">Bon de commande</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Numéro
                      </label>
                      <input
                        type="text"
                        value={formData.number}
                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                        placeholder="Généré automatiquement"
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Client *
                      </label>
                      <input
                        type="text"
                        required
                        value={clientSearch || (formData.clientId ? getClientName(formData.clientId) : '')}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setShowClientDropdown(true);
                          if (!e.target.value) {
                            setFormData({ ...formData, clientId: '' });
                          }
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        onBlur={() => {
                          // Délai pour permettre le clic sur un élément de la liste
                          setTimeout(() => setShowClientDropdown(false), 200);
                        }}
                        placeholder="Rechercher un client..."
                        className="input"
                      />
                      {showClientDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                          {clients
                            .filter((client) =>
                              client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                              client.phone?.includes(clientSearch) ||
                              client.email?.toLowerCase().includes(clientSearch.toLowerCase())
                            )
                            .slice(0, 10)
                            .map((client) => (
                              <div
                                key={client.id}
                                onClick={() => {
                                  setFormData({ ...formData, clientId: client.id });
                                  setClientSearch(client.name);
                                  setShowClientDropdown(false);
                                }}
                                className="px-4 py-2 hover:bg-primary-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-gray-900">{client.name}</div>
                                {client.phone && (
                                  <div className="text-xs text-gray-500">{client.phone}</div>
                                )}
                                {client.email && (
                                  <div className="text-xs text-gray-500">{client.email}</div>
                                )}
                              </div>
                            ))}
                          {clients.filter((client) =>
                            client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                            client.phone?.includes(clientSearch) ||
                            client.email?.toLowerCase().includes(clientSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="px-4 py-2 text-sm text-gray-500 text-center">
                              Aucun client trouvé
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Projet {formData.type === 'facture' ? '*' : '(optionnel)'}
                      </label>
                      <select
                        value={formData.projectId}
                        onChange={(e) => {
                          setFormData({ 
                            ...formData, 
                            projectId: e.target.value,
                            manualRevenueId: e.target.value ? '' : formData.manualRevenueId // Réinitialiser dépannage si projet sélectionné
                          });
                        }}
                        className="input"
                        required={formData.type === 'facture' && !formData.manualRevenueId}
                      >
                        <option value="">Aucun projet</option>
                        {projects
                          .filter((p) => p.clientId === formData.clientId)
                          .map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.title}
                            </option>
                          ))}
                      </select>
                      {formData.clientId && (
                        <p className="text-xs text-gray-500 mt-1">
                          {projects.filter((p) => p.clientId === formData.clientId).length} projet(s) disponible(s) pour ce client
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Dépannage - uniquement pour les factures */}
                  {formData.type === 'facture' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dépannage {!formData.projectId ? '*' : '(optionnel)'}
                      </label>
                      <select
                        value={formData.manualRevenueId}
                        onChange={(e) => {
                          setFormData({ 
                            ...formData, 
                            manualRevenueId: e.target.value,
                            projectId: e.target.value ? '' : formData.projectId // Réinitialiser projet si dépannage sélectionné
                          });
                        }}
                        className="input"
                        required={formData.type === 'facture' && !formData.projectId}
                      >
                        <option value="">Aucun dépannage</option>
                        {manualRevenues
                          .filter((r) => r.clientId === formData.clientId)
                          .map((revenue) => (
                            <option key={revenue.id} value={revenue.id}>
                              {formatDate(revenue.date)} - {formatCurrency(revenue.amount)} - {revenue.description}
                            </option>
                          ))}
                      </select>
                      {formData.clientId && (
                        <p className="text-xs text-gray-500 mt-1">
                          {manualRevenues.filter((r) => r.clientId === formData.clientId).length} dépannage(s) disponible(s) pour ce client
                        </p>
                      )}
                      {formData.type === 'facture' && !formData.projectId && !formData.manualRevenueId && (
                        <p className="text-xs text-red-600 mt-1">
                          ⚠️ Une facture doit être liée à un projet ou à un dépannage
                        </p>
                      )}
                    </div>
                  )}

                  {/* Option TVA - Uniquement pour les devis */}
                  {formData.type === 'devis' && (
                    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <input
                        type="checkbox"
                        id="includeTax"
                        checked={formData.includeTax}
                        onChange={(e) => {
                          const includeTax = e.target.checked;
                          const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
                          const tax = includeTax ? subtotal * 0.2 : 0;
                          const total = subtotal + tax;
                          setFormData({ 
                            ...formData, 
                            includeTax,
                            tax,
                            total
                          });
                        }}
                        className="rounded"
                      />
                      <label htmlFor="includeTax" className="text-sm font-medium text-gray-700 cursor-pointer">
                        Inclure la TVA (20%)
                      </label>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        Date d&apos;échéance
                      </label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Articles
                    </label>
                    <div className="border border-gray-300 rounded-lg p-4 space-y-4">
                      <div className="space-y-4">
                        {/* Ligne descriptive sans prix */}
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="descOnly"
                            checked={currentItem.descriptionOnly}
                            onChange={(e) =>
                              setCurrentItem({ ...currentItem, descriptionOnly: e.target.checked })
                            }
                            className="rounded border-gray-300"
                          />
                          <label htmlFor="descOnly" className="text-sm text-gray-700">
                            Ligne descriptive sans prix (afficher — pour qté, prix unit., total)
                          </label>
                        </div>
                        {/* Ligne 1: Description et Unité */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <input
                              type="text"
                              placeholder="Description"
                              value={currentItem.description}
                              onChange={(e) =>
                                setCurrentItem({ ...currentItem, description: e.target.value })
                              }
                              className="input"
                            />
                          </div>
                          <div>
                            <select
                              value={currentItem.unit}
                              onChange={(e) =>
                                setCurrentItem({
                                  ...currentItem,
                                  unit: e.target.value as typeof currentItem.unit,
                                  length: '',
                                  width: '',
                                  height: '',
                                })
                              }
                              className="input"
                              disabled={currentItem.descriptionOnly}
                            >
                              <option value="piece">Pièce</option>
                              <option value="m2">m²</option>
                              <option value="m">m (mètre linéaire)</option>
                              <option value="m3">m³</option>
                              <option value="kg">kg</option>
                              <option value="heure">Heure</option>
                              <option value="jour">Jour</option>
                              <option value="unite">Unité</option>
                            </select>
                          </div>
                        </div>

                        {/* Ligne 2: Dimensions selon l'unité (masqué si ligne descriptive) */}
                        {!currentItem.descriptionOnly && currentItem.unit === 'm2' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                Quantité (m²)
                              </label>
                              <input
                                type="number"
                                placeholder=""
                                min="0"
                                step="0.01"
                                value={currentItem.quantity}
                                onChange={(e) =>
                                  setCurrentItem({
                                    ...currentItem,
                                    quantity: e.target.value,
                                  })
                                }
                                className="input"
                              />
                            </div>
                          </div>
                        )}

                        {!currentItem.descriptionOnly && currentItem.unit === 'm' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Longueur (m)</label>
                              <input
                                type="number"
                                placeholder="Longueur"
                                min="0"
                                step="0.01"
                                value={currentItem.length}
                                onChange={(e) =>
                                  setCurrentItem({ ...currentItem, length: e.target.value })
                                }
                                className="input"
                              />
                            </div>
                            <div className="flex items-end">
                              {currentItem.length && (
                                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded w-full">
                                  Longueur: {parseFloat(currentItem.length || '0').toFixed(2)} m
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {!currentItem.descriptionOnly && currentItem.unit === 'm3' && (
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Longueur (m)</label>
                              <input
                                type="number"
                                placeholder="Longueur"
                                min="0"
                                step="0.01"
                                value={currentItem.length}
                                onChange={(e) =>
                                  setCurrentItem({ ...currentItem, length: e.target.value })
                                }
                                className="input"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Largeur (m)</label>
                              <input
                                type="number"
                                placeholder="Largeur"
                                min="0"
                                step="0.01"
                                value={currentItem.width}
                                onChange={(e) =>
                                  setCurrentItem({ ...currentItem, width: e.target.value })
                                }
                                className="input"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Hauteur (m)</label>
                              <input
                                type="number"
                                placeholder="Hauteur"
                                min="0"
                                step="0.01"
                                value={currentItem.height}
                                onChange={(e) =>
                                  setCurrentItem({ ...currentItem, height: e.target.value })
                                }
                                className="input"
                              />
                            </div>
                            <div className="flex items-end">
                              {currentItem.length && currentItem.width && currentItem.height && (
                                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded w-full">
                                  Volume: {(
                                    parseFloat(currentItem.length || '0') *
                                    parseFloat(currentItem.width || '0') *
                                    parseFloat(currentItem.height || '0')
                                  ).toFixed(2)} m³
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {!currentItem.descriptionOnly && (currentItem.unit === 'piece' || currentItem.unit === 'kg' ||
                          currentItem.unit === 'heure' || currentItem.unit === 'jour' ||
                          currentItem.unit === 'unite') && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                Quantité
                                {currentItem.unit === 'piece' && ' (pièces)'}
                                {currentItem.unit === 'kg' && ' (kg)'}
                                {currentItem.unit === 'heure' && ' (heures)'}
                                {currentItem.unit === 'jour' && ' (jours)'}
                                {currentItem.unit === 'unite' && ' (unités)'}
                              </label>
                              <input
                                type="number"
                                placeholder=""
                                min="0"
                                step={currentItem.unit === 'kg' ? '0.01' : '1'}
                                value={currentItem.quantity}
                                onChange={(e) =>
                                  setCurrentItem({
                                    ...currentItem,
                                    quantity: e.target.value,
                                  })
                                }
                                className="input"
                              />
                            </div>
                          </div>
                        )}

                        {/* Ligne 3: Prix unitaire et bouton (masqué si ligne descriptive) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {!currentItem.descriptionOnly && (
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                Prix unitaire (MAD)
                              </label>
                              <input
                                type="number"
                                placeholder="Prix unitaire"
                                min="0"
                                step="0.01"
                                value={currentItem.unitPrice}
                                onChange={(e) =>
                                  setCurrentItem({
                                    ...currentItem,
                                    unitPrice: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="input"
                              />
                            </div>
                          )}
                          <div className={currentItem.descriptionOnly ? 'flex items-end' : 'md:col-span-2 flex items-end'}>
                            <button
                              type="button"
                              onClick={addItem}
                              className="btn btn-primary whitespace-nowrap w-full md:w-auto"
                            >
                              {currentItem.descriptionOnly ? 'Ajouter la ligne descriptive' : "Ajouter l'article"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {formData.items.length > 0 && (
                        <div className="mt-4">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">
                                  Description
                                </th>
                                <th className="text-right py-2 px-2 text-sm font-medium text-gray-700">
                                  Qté
                                </th>
                                <th className="text-right py-2 px-2 text-sm font-medium text-gray-700">
                                  Prix unit.
                                </th>
                                <th className="text-right py-2 px-2 text-sm font-medium text-gray-700">
                                  Total
                                </th>
                                <th className="text-right py-2 px-2 text-sm font-medium text-gray-700">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {formData.items.map((item, index) => {
                                const getUnitLabel = (unit?: string) => {
                                  const labels: Record<string, string> = {
                                    piece: 'pièce',
                                    m2: 'm²',
                                    m: 'm',
                                    m3: 'm³',
                                    kg: 'kg',
                                    heure: 'h',
                                    jour: 'j',
                                    unite: 'unité',
                                  };
                                  return labels[unit || 'piece'] || '';
                                };

                                const getQuantityDisplay = () => {
                                  if (item.descriptionOnly) return '—';
                                  let qty = item.quantity.toFixed(2);
                                  if (item.unit === 'm2') {
                                    return `${qty} m²`;
                                  } else if (item.unit === 'm' && item.length) {
                                    return `${qty} m (${item.length} m)`;
                                  } else if (item.unit === 'm3' && item.length && item.width && item.height) {
                                    return `${qty} m³ (${item.length} × ${item.width} × ${item.height} m)`;
                                  } else {
                                    return qty;
                                  }
                                };

                                return (
                                  <tr key={index} className="border-b border-gray-100">
                                    <td className="py-2 px-2 text-sm text-gray-900">
                                      {item.description}
                                    </td>
                                    <td className="py-2 px-2 text-sm text-gray-600 text-right">
                                      {getQuantityDisplay()}
                                    </td>
                                    <td className="py-2 px-2 text-sm text-gray-600 text-right">
                                      {item.descriptionOnly ? '—' : formatCurrency(item.unitPrice)}
                                    </td>
                                    <td className="py-2 px-2 text-sm font-medium text-gray-900 text-right">
                                      {item.descriptionOnly ? '—' : formatCurrency(item.total)}
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                      <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan={3} className="py-2 px-2 text-right font-medium text-gray-700">
                                  Sous-total HT
                                </td>
                                <td className="py-2 px-2 text-right font-medium text-gray-900">
                                  {formatCurrency(formData.subtotal)}
                                </td>
                                <td></td>
                              </tr>
                              {/* Afficher la TVA uniquement si elle est incluse (pour les devis) ou toujours pour factures/bons de commande */}
                              {(formData.type !== 'devis' || formData.includeTax) && (
                                <tr>
                                  <td colSpan={3} className="py-2 px-2 text-right font-medium text-gray-700">
                                    TVA (20%)
                                  </td>
                                  <td className="py-2 px-2 text-right font-medium text-gray-900">
                                    {formatCurrency(formData.tax)}
                                  </td>
                                  <td></td>
                                </tr>
                              )}
                              <tr className="border-t-2 border-gray-300">
                                <td colSpan={3} className="py-2 px-2 text-right font-bold text-gray-900">
                                  Total TTC {formData.manualTotal != null ? '(saisi)' : ''}
                                </td>
                                <td className="py-2 px-2 text-right font-bold text-gray-900">
                                  {formatCurrency(formData.manualTotal ?? formData.total)}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}

                      {/* Descriptions supplémentaires (sans prix) + Total saisi manuellement */}
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descriptions supplémentaires en bas du document (sans prix, une ligne par description)
                          </label>
                          <textarea
                            value={(formData.footerDescriptions ?? []).join('\n')}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                footerDescriptions: e.target.value ? e.target.value.split('\n').map(s => s.trim()).filter(Boolean) : [],
                              })
                            }
                            placeholder={'Une description par ligne\nEx: Mention légale\nCondition de paiement'}
                            className="input min-h-[80px]"
                            rows={4}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total TTC saisi manuellement (optionnel)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Laisser vide pour utiliser le total calculé"
                            value={formData.manualTotal ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFormData({
                                ...formData,
                                manualTotal: v === '' ? undefined : parseFloat(v) || 0,
                              });
                            }}
                            className="input w-48"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Statut *
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as Document['status'] })
                      }
                      className="input"
                    >
                      <option value="brouillon">Brouillon</option>
                      <option value="envoye">Envoyé</option>
                      <option value="paye">Payé</option>
                      <option value="annule">Annulé</option>
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
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingDocument(null);
                      }}
                      className="btn btn-secondary"
                    >
                      Annuler
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingDocument ? 'Modifier' : 'Créer'}
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

export default function DocumentsPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    }>
      <DocumentsContent />
    </Suspense>
  );
}
