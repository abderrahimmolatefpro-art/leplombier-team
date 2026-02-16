'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { collection, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { generatePassword } from '@/lib/auth-utils';
import { Recruitment, User } from '@/types';
import { formatDate } from '@/lib/utils';
import { CheckCircle, XCircle, Trash2, Search, Eye, Edit, X } from 'lucide-react';

const ZONE_LABELS: Record<string, string> = {
  casa: 'Casablanca',
  rabat: 'Rabat',
  tanger: 'Tanger',
  marrakech: 'Marrakech',
  agadir: 'Agadir',
  tetouan: 'Tétouan',
  fes: 'Fès',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  contacted: 'Contacté',
  accepted: 'Accepté',
  rejected: 'Rejeté',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  contacted: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const PLOMBIER_VALIDATION_LABELS: Record<string, string> = {
  pending_documents: 'Documents en attente',
  documents_submitted: 'Documents soumis',
  rejected: 'Documents rejetés',
};

const PLOMBIER_VALIDATION_COLORS: Record<string, string> = {
  pending_documents: 'bg-amber-100 text-amber-700',
  documents_submitted: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
};

const FAMILY_SITUATION_LABELS: Record<string, string> = {
  celibataire: 'Célibataire',
  marie: 'Marié(e)',
  divorce: 'Divorcé(e)',
  veuf: 'Veuf(ve)',
};

export default function RecruitmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [pendingValidationPlombiers, setPendingValidationPlombiers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterZone, setFilterZone] = useState<string>('all');
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedRecruitment, setSelectedRecruitment] = useState<Recruitment | null>(null);
  const [acceptPassword, setAcceptPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [documentsModalPlombier, setDocumentsModalPlombier] = useState<User | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      const init = async () => {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          try {
            await fetch('/api/plombiers/cleanup-expired', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch (e) {
            console.error('Cleanup expired:', e);
          }
        }
        loadData();
      };
      init();
    }
  }, [user, authLoading, router]);

  const loadData = async () => {
    await Promise.all([loadRecruitments(), loadPendingValidationPlombiers()]);
  };

  const loadPendingValidationPlombiers = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'plombier'))
      );
      const list = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
          } as User;
        })
        .filter((p) => p.validationStatus && p.validationStatus !== 'validated');
      list.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      setPendingValidationPlombiers(list);
    } catch (e) {
      console.error('Load pending plombiers:', e);
    }
  };

  const loadRecruitments = async () => {
    try {
      let snapshot;
      try {
        const recruitmentsQuery = query(
          collection(db, 'recruitments'),
          orderBy('createdAt', 'desc')
        );
        snapshot = await getDocs(recruitmentsQuery);
      } catch (orderByError: any) {
        // Fallback: try without orderBy (in case index is missing)
        snapshot = await getDocs(collection(db, 'recruitments'));
      }
      const recruitmentsData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      }) as Recruitment[];
      // Sort manually if orderBy failed
      recruitmentsData.sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return bTime - aTime; // desc
      });
      setRecruitments(recruitmentsData);
    } catch (error: any) {
      console.error('Error loading recruitments:', error);
      if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
        console.error('PERMISSIONS ERROR: Vérifiez que:');
        console.error('1. Votre utilisateur a le rôle "admin" dans Firestore (collection "users")');
        console.error('2. Les règles Firestore sont publiées dans Firebase Console');
        console.error('3. Votre userId:', user?.id);
        console.error('4. Votre rôle actuel:', user?.role);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: Recruitment['status']) => {
    try {
      await updateDoc(doc(db, 'recruitments', id), {
        status: newStatus,
        updatedAt: new Date(),
      });
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
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
    if (!confirm('Rejeter les documents de ce plombier ? Un SMS lui sera envoyé pour re-soumettre.')) return;
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      alert('Session expirée. Veuillez vous reconnecter.');
      return;
    }
    try {
      const res = await fetch('/api/plombiers/reject-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plombierId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors du rejet');
      loadData();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Erreur lors du rejet');
    }
  };

  const handleDeletePlombier = async (plombierId: string, plombierName: string) => {
    if (!confirm(`Supprimer définitivement ${plombierName} ? Cette action est irréversible.`)) return;
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      alert('Session expirée. Veuillez vous reconnecter.');
      return;
    }
    try {
      const res = await fetch(`/api/plombiers/${plombierId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la suppression');
      loadData();
      alert('Plombier supprimé définitivement.');
    } catch (error) {
      console.error('Error deleting plombier:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    }
  };

  const handleAcceptAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecruitment || !acceptPassword || acceptPassword.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      alert('Session expirée. Veuillez vous reconnecter.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/plombiers/create-from-recruitment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recruitmentId: selectedRecruitment.id,
          password: acceptPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la création');
      setShowAcceptModal(false);
      setSelectedRecruitment(null);
      setAcceptPassword('');
      loadData();
      alert('Compte plombier créé ! Communiquez le mot de passe au plombier.');
    } catch (error) {
      console.error('Error creating plombier from recruitment:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la création du compte');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette candidature ?')) return;
    try {
      await deleteDoc(doc(db, 'recruitments', id));
      loadData();
    } catch (error) {
      console.error('Error deleting recruitment:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const filteredRecruitments = recruitments
    .filter((r) => r.status !== 'accepted')
    .filter((recruitment) => {
      const matchesSearch =
        searchQuery === '' ||
        recruitment.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recruitment.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recruitment.phone.includes(searchQuery) ||
        recruitment.specialty.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || recruitment.status === filterStatus;
      const matchesZone = filterZone === 'all' || recruitment.zones === filterZone;
      return matchesSearch && matchesStatus && matchesZone;
    });

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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Candidatures</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
              {filteredRecruitments.length} candidature{filteredRecruitments.length > 1 ? 's' : ''} (hors acceptées)
              {pendingValidationPlombiers.length > 0 && ` • ${pendingValidationPlombiers.length} en attente de validation`}
            </p>
          </div>
        </div>

        {/* Bloc : En attente de validation (candidatures acceptées, documents non validés) */}
        {pendingValidationPlombiers.length > 0 && (
          <div className="card p-0 overflow-hidden border-amber-200 bg-amber-50/20">
            <div className="p-4 border-b border-amber-100">
              <h2 className="text-lg font-bold text-gray-900">
                En attente de validation ({pendingValidationPlombiers.length})
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Comptes créés, documents non validés. Validez pour les faire apparaître dans Plombiers. Suppression auto après 3 jours sans documents.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase">Candidat</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingValidationPlombiers.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="text-sm font-medium text-gray-900">{p.name}</div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                        <a href={`tel:${p.phone}`} className="text-sm text-primary-600 hover:text-primary-800">
                          {p.phone || '—'}
                        </a>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${PLOMBIER_VALIDATION_COLORS[p.validationStatus || ''] || 'bg-gray-100 text-gray-700'}`}>
                          {PLOMBIER_VALIDATION_LABELS[p.validationStatus || ''] || p.validationStatus}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                          {(p.validationStatus === 'documents_submitted' || p.validationStatus === 'pending_documents') && (
                            <button
                              onClick={() => setDocumentsModalPlombier(p)}
                              className="btn btn-sm btn-secondary flex items-center space-x-1"
                              title="Voir documents"
                            >
                              <Eye size={14} />
                              <span className="hidden sm:inline">Documents</span>
                            </button>
                          )}
                          {p.validationStatus === 'documents_submitted' && (
                            <>
                              <button
                                onClick={() => handleValidatePlombier(p.id)}
                                className="btn btn-sm btn-success flex items-center space-x-1"
                                title="Valider"
                              >
                                <CheckCircle size={14} />
                                <span className="hidden sm:inline">Valider</span>
                              </button>
                              <button
                                onClick={() => handleRejectPlombier(p.id)}
                                className="btn btn-sm btn-danger flex items-center space-x-1"
                                title="Rejeter"
                              >
                                <XCircle size={14} />
                                <span className="hidden sm:inline">Rejeter</span>
                              </button>
                            </>
                          )}
                          <Link
                            href={`/plombiers/${p.id}`}
                            className="btn btn-sm btn-secondary flex items-center space-x-1"
                            title="Fiche"
                          >
                            <Edit size={14} />
                            <span className="hidden sm:inline">Fiche</span>
                          </Link>
                          <button
                            onClick={() => handleDeletePlombier(p.id, p.name)}
                            className="btn btn-sm btn-danger flex items-center space-x-1"
                            title="Supprimer définitivement"
                          >
                            <Trash2 size={14} />
                            <span className="hidden sm:inline">Supprimer</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative sm:col-span-3 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 sm:w-5 sm:h-5" size={18} />
              <input
                type="text"
                placeholder="Rechercher (nom, téléphone, spécialité...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Status filter */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input"
              >
                <option value="all">Tous (hors acceptées)</option>
                <option value="pending">En attente</option>
                <option value="contacted">Contacté</option>
                <option value="rejected">Rejeté</option>
              </select>
            </div>

            {/* Zone filter */}
            <div>
              <select
                value={filterZone}
                onChange={(e) => setFilterZone(e.target.value)}
                className="input"
              >
                <option value="all">Toutes les zones</option>
                {Object.entries(ZONE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Recruitments Table */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Candidat</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Spécialité / Zone</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecruitments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500 text-sm">
                      {recruitments.length === 0
                        ? 'Aucune candidature pour le moment'
                        : 'Aucune candidature ne correspond aux filtres'}
                    </td>
                  </tr>
                ) : (
                  filteredRecruitments.map((recruitment) => (
                    <tr key={recruitment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {recruitment.firstName} {recruitment.lastName}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]" title={recruitment.address}>
                          {recruitment.address}
                        </div>
                        {(recruitment.city || recruitment.familySituation !== undefined || recruitment.hasTransport !== undefined || recruitment.experienceYears !== undefined) && (
                          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                            {recruitment.city && <span className="block">Ville: {recruitment.city}</span>}
                            {recruitment.familySituation && <span className="block">Situation: {FAMILY_SITUATION_LABELS[recruitment.familySituation] || recruitment.familySituation}</span>}
                            {recruitment.hasTransport !== undefined && <span className="block">Transport: {recruitment.hasTransport ? 'Oui' : 'Non'}</span>}
                            {recruitment.experienceYears !== undefined && <span className="block">Expérience: {recruitment.experienceYears} an(s)</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                        <a href={`tel:${recruitment.phone}`} className="text-sm text-primary-600 hover:text-primary-800">
                          {recruitment.phone}
                        </a>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{recruitment.specialty}</div>
                        <div className="text-xs text-gray-500">{ZONE_LABELS[recruitment.zones] || recruitment.zones}</div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(recruitment.createdAt)}</div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[recruitment.status]}`}>
                          {STATUS_LABELS[recruitment.status]}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                          {recruitment.status !== 'accepted' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRecruitment(recruitment);
                                setAcceptPassword(generatePassword());
                                setShowAcceptModal(true);
                              }}
                              className="btn btn-sm btn-success flex items-center space-x-1"
                              title="Accepter et créer le compte plombier"
                            >
                              <CheckCircle size={14} />
                              <span className="hidden sm:inline">Accepter</span>
                            </button>
                          )}
                          {recruitment.status !== 'rejected' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(recruitment.id, 'rejected');
                              }}
                              className="btn btn-sm btn-danger flex items-center space-x-1"
                              title="Rejeter la candidature"
                            >
                              <XCircle size={14} />
                              <span className="hidden sm:inline">Rejeter</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(recruitment.id);
                            }}
                            className="btn btn-sm btn-secondary flex items-center space-x-1"
                            title="Supprimer la candidature"
                          >
                            <Trash2 size={14} />
                            <span className="hidden sm:inline">Supprimer</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Accepter et créer le compte */}
        {showAcceptModal && selectedRecruitment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Accepter et créer le compte plombier
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Le compte sera créé pour <strong>{selectedRecruitment.firstName} {selectedRecruitment.lastName}</strong> ({selectedRecruitment.phone}). Communiquez le mot de passe au plombier.
                </p>
                {(selectedRecruitment.city || selectedRecruitment.familySituation || selectedRecruitment.hasTransport !== undefined || selectedRecruitment.experienceYears !== undefined) && (
                  <div className="text-xs text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg space-y-1">
                    {selectedRecruitment.city && <p><strong>Ville:</strong> {selectedRecruitment.city}</p>}
                    {selectedRecruitment.familySituation && <p><strong>Situation familiale:</strong> {FAMILY_SITUATION_LABELS[selectedRecruitment.familySituation] || selectedRecruitment.familySituation}</p>}
                    {selectedRecruitment.hasTransport !== undefined && <p><strong>Moyen de transport:</strong> {selectedRecruitment.hasTransport ? 'Oui' : 'Non'}</p>}
                    {selectedRecruitment.experienceYears !== undefined && <p><strong>Années d&apos;expérience:</strong> {selectedRecruitment.experienceYears} an(s)</p>}
                  </div>
                )}
                <form onSubmit={handleAcceptAndCreate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mot de passe *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        minLength={6}
                        value={acceptPassword}
                        onChange={(e) => setAcceptPassword(e.target.value)}
                        className="input flex-1"
                        placeholder="Minimum 6 caractères"
                      />
                      <button
                        type="button"
                        onClick={() => setAcceptPassword(generatePassword())}
                        className="btn btn-secondary whitespace-nowrap"
                      >
                        Générer
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAcceptModal(false);
                        setSelectedRecruitment(null);
                        setAcceptPassword('');
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
                      {creating ? 'Création...' : 'Créer le compte'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal documents plombier */}
        {documentsModalPlombier && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Documents – {documentsModalPlombier.name}
                  </h2>
                  <button
                    onClick={() => setDocumentsModalPlombier(null)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  {documentsModalPlombier.nationalIdPhotoUrl && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Carte d&apos;identité nationale</p>
                      <img
                        src={documentsModalPlombier.nationalIdPhotoUrl}
                        alt="CNI"
                        className="w-full rounded-lg border border-gray-200 max-h-64 object-contain bg-gray-50"
                      />
                    </div>
                  )}
                  {documentsModalPlombier.selfiePhotoUrl && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Selfie</p>
                      <img
                        src={documentsModalPlombier.selfiePhotoUrl}
                        alt="Selfie"
                        className="w-full rounded-lg border border-gray-200 max-h-64 object-contain bg-gray-50"
                      />
                    </div>
                  )}
                </div>
                {documentsModalPlombier.validationStatus === 'documents_submitted' && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        handleValidatePlombier(documentsModalPlombier.id);
                        setDocumentsModalPlombier(null);
                      }}
                      className="btn btn-success flex items-center gap-2"
                    >
                      <CheckCircle size={18} />
                      Valider
                    </button>
                    <button
                      onClick={() => {
                        handleRejectPlombier(documentsModalPlombier.id);
                        setDocumentsModalPlombier(null);
                      }}
                      className="btn btn-danger flex items-center gap-2"
                    >
                      <XCircle size={18} />
                      Rejeter
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
