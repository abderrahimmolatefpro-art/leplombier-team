'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, Client, User } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Plus, Edit, Trash2, Users as UsersIcon, Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function ProjetsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [projets, setProjets] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [plombiers, setPlombiers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formData, setFormData] = useState({
    clientId: '',
    type: 'recherche_fuite' as Project['type'], // Valeur par défaut, mais champ supprimé du formulaire
    title: '',
    description: '',
    status: 'en_attente' as Project['status'],
    startDate: '',
    estimatedDuration: 1,
    teamLeaderId: '',
    plombierIds: [] as string[],
    progress: 0,
    progressStatus: 'non_commence' as Project['progressStatus'],
    address: '',
    amount: '',
    hasInvoice: false,
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
      // Load projects
      const projectsQuery = query(collection(db, 'projects'));
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
      setProjets(projectsData);

      // Load clients
      const clientsSnapshot = await getDocs(collection(db, 'clients'));
      const clientsData = clientsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Client[];
      setClients(clientsData);

      // Load plombiers
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
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const projectData = {
        ...formData,
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        amount: formData.amount ? parseFloat(formData.amount) : null,
        hasInvoice: formData.hasInvoice,
        createdAt: editingProject ? editingProject.createdAt : Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (editingProject) {
        await updateDoc(doc(db, 'projects', editingProject.id), projectData);
      } else {
        await addDoc(collection(db, 'projects'), projectData);
      }

      setShowModal(false);
      setEditingProject(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      clientId: project.clientId,
      type: project.type,
      title: project.title,
      description: project.description,
      status: project.status,
      startDate: project.startDate.toISOString().split('T')[0],
      estimatedDuration: project.estimatedDuration,
      teamLeaderId: project.teamLeaderId,
      plombierIds: project.plombierIds,
      progress: project.progress,
      progressStatus: project.progressStatus,
      address: project.address,
      amount: project.amount?.toString() || '',
      hasInvoice: project.hasInvoice || false,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) return;

    try {
      await deleteDoc(doc(db, 'projects', id));
      loadData();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      type: 'recherche_fuite',
      title: '',
      description: '',
      status: 'en_attente',
      startDate: '',
      estimatedDuration: 1,
      teamLeaderId: '',
      plombierIds: [],
      progress: 0,
      progressStatus: 'non_commence',
      address: '',
      amount: '',
      hasInvoice: false,
    });
  };

  const getClientName = (clientId: string) => {
    return clients.find((c) => c.id === clientId)?.name || 'Client inconnu';
  };

  const getPlombierName = (plombierId: string) => {
    return plombiers.find((p) => p.id === plombierId)?.name || 'Inconnu';
  };

  const filteredProjects = filterStatus === 'all' 
    ? projets 
    : projets.filter((p) => p.status === filterStatus);

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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Projets</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Gestion des travaux et projets</p>
          </div>
          <button
            onClick={() => {
              setEditingProject(null);
              resetForm();
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Plus size={18} className="sm:w-5 sm:h-5" />
            <span>Nouveau projet</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setFilterStatus('en_attente')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              filterStatus === 'en_attente'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            En attente
          </button>
          <button
            onClick={() => setFilterStatus('en_cours')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              filterStatus === 'en_cours'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            En cours
          </button>
          <button
            onClick={() => setFilterStatus('termine')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              filterStatus === 'termine'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Terminés
          </button>
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <div key={project.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <Link
                        href={`/projets/${project.id}`}
                        className="text-lg sm:text-xl font-semibold text-primary-600 hover:underline"
                      >
                        {project.title}
                      </Link>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        Client: {getClientName(project.clientId)}
                      </p>
                    </div>
                    <div className="flex space-x-1 sm:space-x-2">
                      <button
                        onClick={() => handleEdit(project)}
                        className="p-1 text-gray-600 hover:text-primary-600"
                      >
                        <Edit size={14} className="sm:w-[18px] sm:h-[18px]" />
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="p-1 text-gray-600 hover:text-red-600"
                      >
                        <Trash2 size={14} className="sm:w-[18px] sm:h-[18px]" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-3 sm:mt-4">
                    <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                      <span className="font-medium">Type:</span>
                      <span>
                        {project.type === 'recherche_fuite' && 'Recherche de fuite'}
                        {project.type === 'reparation_lourde' && 'Réparation lourde'}
                        {project.type === 'renovation_salle_bain' && 'Rénovation salle de bain'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                      <Calendar size={14} className="sm:w-4 sm:h-4" />
                      <span>{formatDate(project.startDate)}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                      <UsersIcon size={14} className="sm:w-4 sm:h-4" />
                      <span>{project.plombierIds.length} plombier(s)</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                      <MapPin size={14} className="sm:w-4 sm:h-4" />
                      <span className="truncate">{project.address}</span>
                    </div>
                  </div>

                  {project.amount && project.amount > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span className="text-xs sm:text-sm font-medium text-gray-700">Montant du projet:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-base sm:text-lg font-bold text-primary-600">
                            {formatCurrency(project.amount)}
                          </span>
                          {!project.hasInvoice && (
                            <span className="px-2 py-1 bg-gray-800 text-white text-xs rounded">
                              Sans facture
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Avancement</span>
                      <span className="text-sm text-gray-600">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      project.status === 'en_cours'
                        ? 'bg-green-100 text-green-700'
                        : project.status === 'termine'
                        ? 'bg-gray-100 text-gray-700'
                        : project.status === 'en_attente'
                        ? 'bg-yellow-100 text-yellow-700'
                        : project.status === 'en_pause'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {project.status === 'en_cours' && 'En cours'}
                    {project.status === 'termine' && 'Terminé'}
                    {project.status === 'en_attente' && 'En attente'}
                    {project.status === 'en_pause' && 'En pause'}
                    {project.status === 'annule' && 'Annulé'}
                  </span>
                  {project.teamLeaderId && (
                    <span className="text-xs text-gray-600">
                      Chef: {getPlombierName(project.teamLeaderId)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-gray-500">Aucun projet pour le moment</p>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {editingProject ? 'Modifier le projet' : 'Nouveau projet'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                      Titre *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input"
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date de début
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Durée estimée (jours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.estimatedDuration}
                        onChange={(e) =>
                          setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) })
                        }
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
                        Montant du projet (DH)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="input"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Montant saisi manuellement (sans facture)
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <input
                        type="checkbox"
                        id="hasInvoice"
                        checked={formData.hasInvoice}
                        onChange={(e) => setFormData({ ...formData, hasInvoice: e.target.checked })}
                        className="rounded"
                      />
                      <label htmlFor="hasInvoice" className="text-sm text-gray-700">
                        A une facture associée
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chef d&apos;équipe
                      </label>
                      <select
                        value={formData.teamLeaderId}
                        onChange={(e) => setFormData({ ...formData, teamLeaderId: e.target.value })}
                        className="input"
                      >
                        <option value="">Sélectionner un chef d&apos;équipe</option>
                        {plombiers.map((plombier) => (
                          <option key={plombier.id} value={plombier.id}>
                            {plombier.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Statut
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value as Project['status'] })
                        }
                        className="input"
                      >
                        <option value="en_attente">En attente</option>
                        <option value="en_cours">En cours</option>
                        <option value="en_pause">En pause</option>
                        <option value="termine">Terminé</option>
                        <option value="annule">Annulé</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plombiers
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                      {plombiers.map((plombier) => (
                        <label key={plombier.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.plombierIds.includes(plombier.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  plombierIds: [...formData.plombierIds, plombier.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  plombierIds: formData.plombierIds.filter((id) => id !== plombier.id),
                                });
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">{plombier.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Avancement (%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.progress}
                      onChange={(e) =>
                        setFormData({ ...formData, progress: parseInt(e.target.value) })
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>0%</span>
                      <span className="font-medium">{formData.progress}%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingProject(null);
                      }}
                      className="btn btn-secondary"
                    >
                      Annuler
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingProject ? 'Modifier' : 'Créer'}
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
