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
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Supplier } from '@/types';
import { Package, Plus, Edit, Trash2, X } from 'lucide-react';

export default function FournisseursPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    enabled: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadSuppliers();
    }
  }, [user, authLoading, router]);

  const loadSuppliers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'suppliers'));
      const data = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          ...raw,
          createdAt: raw.createdAt?.toDate?.() || new Date(),
          updatedAt: raw.updatedAt?.toDate?.() || new Date(),
        } as Supplier;
      });
      data.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
      setSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      alert('Erreur lors du chargement des fournisseurs');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      enabled: true,
    });
    setShowModal(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address || '',
      notes: supplier.notes || '',
      enabled: supplier.enabled,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      alert('Nom, email et téléphone sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const now = Timestamp.now();
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
        enabled: formData.enabled,
        updatedAt: now,
      };

      if (editingSupplier) {
        await updateDoc(doc(db, 'suppliers', editingSupplier.id), payload);
      } else {
        await addDoc(collection(db, 'suppliers'), {
          ...payload,
          createdAt: now,
        });
      }
      closeModal();
      loadSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (supplier: Supplier) => {
    try {
      await updateDoc(doc(db, 'suppliers', supplier.id), {
        enabled: !supplier.enabled,
        updatedAt: Timestamp.now(),
      });
      loadSuppliers();
    } catch (error) {
      console.error('Error toggling supplier:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const activeSuppliers = suppliers.filter((s) => s.enabled);
  const inactiveSuppliers = suppliers.filter((s) => !s.enabled);

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Fournisseurs</h1>
            <p className="text-sm text-gray-600 mt-1">
              {activeSuppliers.length} actif(s), {inactiveSuppliers.length} inactif(s)
            </p>
          </div>
          <button onClick={openCreateModal} className="btn btn-primary flex items-center gap-2">
            <Plus size={18} />
            Ajouter un fournisseur
          </button>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-500">
                      Aucun fournisseur. Cliquez sur &quot;Ajouter un fournisseur&quot; pour commencer.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s.id} className={s.enabled ? '' : 'bg-gray-50'}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{s.name}</div>
                        {s.address && (
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">{s.address}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <a href={`mailto:${s.email}`} className="text-primary-600 hover:underline">
                          {s.email}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <a href={`tel:${s.phone}`} className="text-primary-600 hover:underline">
                          {s.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            s.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {s.enabled ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                            title="Modifier"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleEnabled(s)}
                            className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                            title={s.enabled ? 'Désactiver' : 'Activer'}
                          >
                            {s.enabled ? <Trash2 size={16} /> : <Package size={16} />}
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="input w-full"
                  placeholder="Ex: Plomberie Pro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className="input w-full"
                  placeholder="contact@fournisseur.ma"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                  className="input w-full"
                  placeholder="+212 6XX XXX XXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse (optionnel)</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                  className="input w-full"
                  placeholder="Adresse du fournisseur"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  className="input w-full"
                  rows={2}
                  placeholder="Notes internes"
                />
              </div>
              {editingSupplier && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData((p) => ({ ...p, enabled: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Actif</span>
                </label>
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn btn-secondary flex-1">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                  {saving ? 'Enregistrement...' : editingSupplier ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
