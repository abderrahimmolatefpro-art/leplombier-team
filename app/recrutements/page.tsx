'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { collection, getDocs, updateDoc, deleteDoc, doc, Timestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Recruitment } from '@/types';
import { formatDate } from '@/lib/utils';
import { CheckCircle, XCircle, Trash2, Search } from 'lucide-react';

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

export default function RecruitmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterZone, setFilterZone] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadRecruitments();
    }
  }, [user, authLoading, router]);

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
        updatedAt: Timestamp.now(),
      });
      loadRecruitments();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette candidature ?')) return;
    
    try {
      await deleteDoc(doc(db, 'recruitments', id));
      loadRecruitments();
    } catch (error) {
      console.error('Error deleting recruitment:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const filteredRecruitments = recruitments.filter((recruitment) => {
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
              {filteredRecruitments.length} candidature{filteredRecruitments.length > 1 ? 's' : ''}
              {recruitments.length !== filteredRecruitments.length && ` sur ${recruitments.length}`}
            </p>
          </div>
        </div>

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
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="contacted">Contacté</option>
                <option value="accepted">Accepté</option>
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
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {recruitment.firstName} {recruitment.lastName}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]" title={recruitment.address}>
                          {recruitment.address}
                        </div>
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
                                handleStatusChange(recruitment.id, 'accepted');
                              }}
                              className="btn btn-sm btn-success flex items-center space-x-1"
                              title="Accepter la candidature"
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
      </div>
    </Layout>
  );
}
