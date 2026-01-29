'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Document, Client, Project, DocumentItem } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Plus, Edit, Trash2, FileText, Download, Mail, Eye } from 'lucide-react';
import Link from 'next/link';

export default function DocumentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [formData, setFormData] = useState({
    type: 'devis' as Document['type'],
    projectId: '',
    clientId: '',
    number: '',
    date: '',
    dueDate: '',
    items: [] as DocumentItem[],
    subtotal: 0,
    tax: 0,
    total: 0,
    status: 'brouillon' as Document['status'],
    notes: '',
  });
  const [currentItem, setCurrentItem] = useState({
    description: '',
    quantity: 1,
    unitPrice: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadData();
    }
  }, [user, authLoading, router]);

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
    if (!currentItem.description || currentItem.quantity <= 0 || currentItem.unitPrice < 0) {
      alert('Veuillez remplir tous les champs de l\'article');
      return;
    }

    const item: DocumentItem = {
      description: currentItem.description,
      quantity: currentItem.quantity,
      unitPrice: currentItem.unitPrice,
      total: currentItem.quantity * currentItem.unitPrice,
    };

    const newItems = [...formData.items, item];
    const subtotal = newItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.2; // 20% TVA
    const total = subtotal + tax;

    setFormData({
      ...formData,
      items: newItems,
      subtotal,
      tax,
      total,
    });

    setCurrentItem({
      description: '',
      quantity: 1,
      unitPrice: 0,
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    const subtotal = newItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.2;
    const total = subtotal + tax;

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
    try {
      const documentData = {
        ...formData,
        number: formData.number || generateDocumentNumber(formData.type),
        date: Timestamp.fromDate(new Date(formData.date || new Date())),
        dueDate: formData.dueDate ? Timestamp.fromDate(new Date(formData.dueDate)) : null,
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
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving document:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (document: Document) => {
    setEditingDocument(document);
    setFormData({
      type: document.type,
      projectId: document.projectId || '',
      clientId: document.clientId,
      number: document.number,
      date: formatDate(document.date).split('/').reverse().join('-'),
      dueDate: document.dueDate ? formatDate(document.dueDate).split('/').reverse().join('-') : '',
      items: document.items,
      subtotal: document.subtotal,
      tax: document.tax,
      total: document.total,
      status: document.status,
      notes: document.notes || '',
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
      clientId: '',
      number: '',
      date: '',
      dueDate: '',
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      status: 'brouillon',
      notes: '',
    });
    setCurrentItem({
      description: '',
      quantity: 1,
      unitPrice: 0,
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
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
            <p className="text-gray-600 mt-2">Factures, devis et bons de commande</p>
          </div>
          <button
            onClick={() => {
              setEditingDocument(null);
              resetForm();
              setFormData({ ...formData, date: new Date().toISOString().split('T')[0] });
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Nouveau document</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setFilterType('facture')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'facture'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Factures
          </button>
          <button
            onClick={() => setFilterType('devis')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'devis'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Devis
          </button>
          <button
            onClick={() => setFilterType('bon_commande')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'bon_commande'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Bons de commande
          </button>
        </div>

        {/* Documents List */}
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Numéro</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Client</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Montant</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Statut</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((document) => (
                <tr key={document.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
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
                  <td className="py-3 px-4 font-medium text-gray-900">{document.number}</td>
                  <td className="py-3 px-4 text-gray-600">{getClientName(document.clientId)}</td>
                  <td className="py-3 px-4 text-gray-600">{formatDate(document.date)}</td>
                  <td className="py-3 px-4 font-medium text-gray-900">{formatCurrency(document.total)}</td>
                  <td className="py-3 px-4">
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
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/documents/${document.id}`}
                        className="p-1 text-gray-600 hover:text-primary-600"
                        title="Voir / Imprimer"
                      >
                        <Eye size={18} />
                      </Link>
                      <button
                        onClick={() => handleEdit(document)}
                        className="p-1 text-gray-600 hover:text-primary-600"
                        title="Modifier"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(document.id)}
                        className="p-1 text-gray-600 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
                        onChange={(e) =>
                          setFormData({ ...formData, type: e.target.value as Document['type'] })
                        }
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Client *
                      </label>
                      <select
                        required
                        value={formData.clientId}
                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                        className="input"
                      >
                        <option value="">Sélectionner un client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Projet (optionnel)
                      </label>
                      <select
                        value={formData.projectId}
                        onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                        className="input"
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
                    </div>
                  </div>

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
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                          <input
                            type="number"
                            placeholder="Quantité"
                            min="1"
                            value={currentItem.quantity}
                            onChange={(e) =>
                              setCurrentItem({
                                ...currentItem,
                                quantity: parseInt(e.target.value) || 1,
                              })
                            }
                            className="input"
                          />
                        </div>
                        <div className="flex space-x-2">
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
                          <button
                            type="button"
                            onClick={addItem}
                            className="btn btn-primary whitespace-nowrap"
                          >
                            Ajouter
                          </button>
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
                              {formData.items.map((item, index) => (
                                <tr key={index} className="border-b border-gray-100">
                                  <td className="py-2 px-2 text-sm text-gray-900">{item.description}</td>
                                  <td className="py-2 px-2 text-sm text-gray-600 text-right">
                                    {item.quantity}
                                  </td>
                                  <td className="py-2 px-2 text-sm text-gray-600 text-right">
                                    {formatCurrency(item.unitPrice)}
                                  </td>
                                  <td className="py-2 px-2 text-sm font-medium text-gray-900 text-right">
                                    {formatCurrency(item.total)}
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
                              ))}
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
                              <tr>
                                <td colSpan={3} className="py-2 px-2 text-right font-medium text-gray-700">
                                  TVA (20%)
                                </td>
                                <td className="py-2 px-2 text-right font-medium text-gray-900">
                                  {formatCurrency(formData.tax)}
                                </td>
                                <td></td>
                              </tr>
                              <tr className="border-t-2 border-gray-300">
                                <td colSpan={3} className="py-2 px-2 text-right font-bold text-gray-900">
                                  Total TTC
                                </td>
                                <td className="py-2 px-2 text-right font-bold text-gray-900">
                                  {formatCurrency(formData.total)}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
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
