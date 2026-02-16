'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
  query,
  where,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import {
  PartRequest,
  PartRequestStatus,
  PartRequestUrgency,
  Supplier,
  User,
  Client,
} from '@/types';
import { formatDate } from '@/lib/utils';
import {
  Edit,
  Send,
  X,
  Filter,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

const STATUS_LABELS: Record<PartRequestStatus, string> = {
  en_attente: 'En attente',
  envoye: 'Envoyé',
  recupere: 'Récupéré',
  facture: 'Facturé',
  rejete: 'Rejeté',
};

const URGENCY_LABELS: Record<PartRequestUrgency, string> = {
  normal: 'Normal',
  urgent: 'Urgent',
  tres_urgent: 'Très urgent',
};

export default function DemandesPiecesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<PartRequest[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [plombiers, setPlombiers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<PartRequest | null>(null);
  const [editFormData, setEditFormData] = useState({
    description: '',
    adminNotes: '',
    supplierId: '',
    status: '' as PartRequestStatus,
  });
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPlombier, setFilterPlombier] = useState<string>('all');
  const [filterSupplier, setFilterSupplier] = useState<string>('all');
  const [filterUrgency, setFilterUrgency] = useState<string>('all');

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
      const [requestsSnap, suppliersSnap, plombiersSnap, clientsSnap] = await Promise.all([
        getDocs(collection(db, 'partRequests')),
        getDocs(collection(db, 'suppliers')),
        getDocs(query(collection(db, 'users'), where('role', '==', 'plombier'))),
        getDocs(collection(db, 'clients')),
      ]);

      const requestsData = requestsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          sentAt: data.sentAt?.toDate?.(),
          receivedAt: data.receivedAt?.toDate?.(),
        } as PartRequest;
      });
      requestsData.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      setRequests(requestsData);

      const suppliersData = suppliersSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        } as Supplier;
      });
      setSuppliers(suppliersData.filter((s) => s.enabled));

      const plombiersData = plombiersSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || new Date(),
        updatedAt: d.data().updatedAt?.toDate?.() || new Date(),
      })) as User[];
      setPlombiers(plombiersData);

      const clientsData = clientsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        } as Client;
      });
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterPlombier !== 'all' && r.plombierId !== filterPlombier) return false;
      if (filterSupplier !== 'all' && r.supplierId !== filterSupplier) return false;
      if (filterUrgency !== 'all' && r.urgency !== filterUrgency) return false;
      return true;
    });
  }, [requests, filterStatus, filterPlombier, filterSupplier, filterUrgency]);

  const openEditModal = (req: PartRequest) => {
    setEditingRequest(req);
    setEditFormData({
      description: req.description,
      adminNotes: req.adminNotes || '',
      supplierId: req.supplierId || '',
      status: req.status,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'partRequests', editingRequest.id), {
        description: editFormData.description.trim(),
        adminNotes: editFormData.adminNotes.trim() || null,
        supplierId: editFormData.supplierId || null,
        status: editFormData.status,
        updatedAt: Timestamp.now(),
      });
      setShowEditModal(false);
      setEditingRequest(null);
      loadData();
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (req: PartRequest, newStatus: PartRequestStatus) => {
    try {
      const updates: Record<string, unknown> = {
        status: newStatus,
        updatedAt: Timestamp.now(),
      };
      if (newStatus === 'recupere') {
        updates.receivedAt = Timestamp.now();
      }
      await updateDoc(doc(db, 'partRequests', req.id), updates);
      loadData();
    } catch (error) {
      console.error(error);
      alert('Erreur lors du changement de statut');
    }
  };

  const handleSendToSupplier = async (req: PartRequest) => {
    if (!req.supplierId) {
      alert('Veuillez d\'abord sélectionner un fournisseur pour cette demande.');
      return;
    }
    if (req.status !== 'en_attente') {
      alert('Seules les demandes en attente peuvent être envoyées.');
      return;
    }
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      alert('Session expirée. Veuillez vous reconnecter.');
      return;
    }
    setSendingId(req.id);
    try {
      const res = await fetch(`/api/part-requests/${req.id}/send-to-supplier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      loadData();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'envoi');
    } finally {
      setSendingId(null);
    }
  };

  const getInterventionLabel = (r: PartRequest) => {
    if (r.projectId) return 'Projet';
    if (r.manualRevenueId) return 'Dépannage';
    return '—';
  };

  const clientsMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const plombiersMap = Object.fromEntries(plombiers.map((p) => [p.id, p.name]));
  const suppliersMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Demandes de pièces</h1>
          <p className="text-sm text-gray-600 mt-1">
            {filteredRequests.length} demande(s)
            {requests.length !== filteredRequests.length && ` sur ${requests.length}`}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtres</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Statut</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input w-full"
              >
                <option value="all">Tous</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Plombier</label>
              <select
                value={filterPlombier}
                onChange={(e) => setFilterPlombier(e.target.value)}
                className="input w-full"
              >
                <option value="all">Tous</option>
                {plombiers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fournisseur</label>
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="input w-full"
              >
                <option value="all">Tous</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Urgence</label>
              <select
                value={filterUrgency}
                onChange={(e) => setFilterUrgency(e.target.value)}
                className="input w-full"
              >
                <option value="all">Toutes</option>
                {Object.entries(URGENCY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plombier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Intervention</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urgence</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fournisseur</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-500">
                      Aucune demande ne correspond aux critères
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm">{plombiersMap[r.plombierId] || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/clients/${r.clientId}`}
                          className="text-primary-600 hover:underline"
                        >
                          {clientsMap[r.clientId] || '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm">{getInterventionLabel(r)}</td>
                      <td className="px-4 py-3 text-sm max-w-[200px]">
                        <span className="line-clamp-2" title={r.description}>{r.description}</span>
                        {r.adminNotes && (
                          <span className="block text-xs text-gray-500 mt-0.5" title={r.adminNotes}>
                            Note: {r.adminNotes.slice(0, 30)}...
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            r.urgency === 'tres_urgent' ? 'bg-red-100 text-red-700' :
                            r.urgency === 'urgent' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {URGENCY_LABELS[r.urgency]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            r.status === 'en_attente' ? 'bg-yellow-100 text-yellow-700' :
                            r.status === 'envoye' ? 'bg-blue-100 text-blue-700' :
                            r.status === 'recupere' || r.status === 'facture' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}
                        >
                          {STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{suppliersMap[r.supplierId || ''] || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <button
                            onClick={() => openEditModal(r)}
                            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                            title="Modifier"
                          >
                            <Edit size={16} />
                          </button>
                          {r.status === 'en_attente' && r.supplierId && (
                            <button
                              onClick={() => handleSendToSupplier(r)}
                              disabled={sendingId === r.id}
                              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                              title="Envoyer au fournisseur"
                            >
                              <Send size={16} />
                            </button>
                          )}
                          {r.status === 'en_attente' && (
                            <select
                              value=""
                              onChange={(e) => {
                                const v = e.target.value as PartRequestStatus;
                                if (v) handleStatusChange(r, v);
                                e.target.value = '';
                              }}
                              className="text-xs border rounded px-2 py-1"
                            >
                              <option value="">Changer statut</option>
                              <option value="rejete">Rejeter</option>
                            </select>
                          )}
                          {r.status === 'envoye' && (
                            <select
                              value=""
                              onChange={(e) => {
                                const v = e.target.value as PartRequestStatus;
                                if (v) handleStatusChange(r, v);
                                e.target.value = '';
                              }}
                              className="text-xs border rounded px-2 py-1"
                            >
                              <option value="">Changer statut</option>
                              <option value="recupere">Récupéré</option>
                            </select>
                          )}
                          {r.status === 'recupere' && (
                            <select
                              value=""
                              onChange={(e) => {
                                const v = e.target.value as PartRequestStatus;
                                if (v) handleStatusChange(r, v);
                                e.target.value = '';
                              }}
                              className="text-xs border rounded px-2 py-1"
                            >
                              <option value="">Changer statut</option>
                              <option value="facture">Facturé</option>
                            </select>
                          )}
                          {r.status === 'facture' && (
                            <Link
                              href={`/clients/${r.clientId}`}
                              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                              title="Voir fiche client"
                            >
                              <ExternalLink size={16} />
                            </Link>
                          )}
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

      {showEditModal && editingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Modifier la demande</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData((p) => ({ ...p, description: e.target.value }))}
                  className="input w-full"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes admin</label>
                <textarea
                  value={editFormData.adminNotes}
                  onChange={(e) => setEditFormData((p) => ({ ...p, adminNotes: e.target.value }))}
                  className="input w-full"
                  rows={2}
                  placeholder="Notes internes"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
                <select
                  value={editFormData.supplierId}
                  onChange={(e) => setEditFormData((p) => ({ ...p, supplierId: e.target.value }))}
                  className="input w-full"
                >
                  <option value="">Sélectionner un fournisseur</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData((p) => ({ ...p, status: e.target.value as PartRequestStatus }))}
                  className="input w-full"
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary flex-1">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
