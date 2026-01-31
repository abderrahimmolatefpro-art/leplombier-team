'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { collection, getDocs, updateDoc, doc, Timestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Recruitment } from '@/types';
import { formatDate } from '@/lib/utils';
import { Users, Phone, MapPin, Calendar, CheckCircle, XCircle, Clock, Search, Filter } from 'lucide-react';

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

    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    if (user) {
      loadRecruitments();
    }
  }, [user, authLoading, router]);

  const loadRecruitments = async () => {
    try {
      const recruitmentsQuery = query(
        collection(db, 'recruitments'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(recruitmentsQuery);
      const recruitmentsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Recruitment[];
      setRecruitments(recruitmentsData);
    } catch (error) {
      console.error('Error loading recruitments:', error);
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

        {/* Recruitments List */}
        <div className="space-y-3 sm:space-y-4">
          {filteredRecruitments.length === 0 ? (
            <div className="card text-center py-12">
              <Users className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">
                {recruitments.length === 0
                  ? 'Aucune candidature pour le moment'
                  : 'Aucune candidature ne correspond aux filtres'}
              </p>
            </div>
          ) : (
            filteredRecruitments.map((recruitment) => (
              <div key={recruitment.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                          {recruitment.firstName} {recruitment.lastName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[recruitment.status]}`}>
                            {STATUS_LABELS[recruitment.status]}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {ZONE_LABELS[recruitment.zones]}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-3">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Phone size={16} className="text-gray-400 flex-shrink-0" />
                        <a href={`tel:${recruitment.phone}`} className="hover:text-primary-600">
                          {recruitment.phone}
                        </a>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{recruitment.address}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Users size={16} className="text-gray-400 flex-shrink-0" />
                        <span>{recruitment.specialty}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                        <span>{formatDate(recruitment.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 flex-shrink-0">
                    {recruitment.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(recruitment.id, 'contacted')}
                          className="btn btn-secondary text-xs sm:text-sm flex items-center justify-center space-x-1 sm:space-x-2"
                        >
                          <Clock size={14} className="sm:w-4 sm:h-4" />
                          <span>Contacté</span>
                        </button>
                        <button
                          onClick={() => handleStatusChange(recruitment.id, 'accepted')}
                          className="btn btn-primary text-xs sm:text-sm flex items-center justify-center space-x-1 sm:space-x-2"
                        >
                          <CheckCircle size={14} className="sm:w-4 sm:h-4" />
                          <span>Accepter</span>
                        </button>
                        <button
                          onClick={() => handleStatusChange(recruitment.id, 'rejected')}
                          className="btn btn-secondary text-xs sm:text-sm flex items-center justify-center space-x-1 sm:space-x-2 bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          <XCircle size={14} className="sm:w-4 sm:h-4" />
                          <span>Rejeter</span>
                        </button>
                      </>
                    )}
                    {recruitment.status === 'contacted' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(recruitment.id, 'accepted')}
                          className="btn btn-primary text-xs sm:text-sm flex items-center justify-center space-x-1 sm:space-x-2"
                        >
                          <CheckCircle size={14} className="sm:w-4 sm:h-4" />
                          <span>Accepter</span>
                        </button>
                        <button
                          onClick={() => handleStatusChange(recruitment.id, 'rejected')}
                          className="btn btn-secondary text-xs sm:text-sm flex items-center justify-center space-x-1 sm:space-x-2 bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          <XCircle size={14} className="sm:w-4 sm:h-4" />
                          <span>Rejeter</span>
                        </button>
                      </>
                    )}
                    {(recruitment.status === 'accepted' || recruitment.status === 'rejected') && (
                      <button
                        onClick={() => handleStatusChange(recruitment.id, 'pending')}
                        className="btn btn-secondary text-xs sm:text-sm flex items-center justify-center space-x-1 sm:space-x-2"
                      >
                        <Clock size={14} className="sm:w-4 sm:h-4" />
                        <span>Remettre en attente</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
