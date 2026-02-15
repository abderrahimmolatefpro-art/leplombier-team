'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';
import { ArrowLeft, Save, Users, BadgeCheck, Check, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function PlombierDetailPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const plombierId = params.id as string;
  
  const [plombier, setPlombier] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    certified: false,
  });

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
      return;
    }

    if (plombierId) {
      loadPlombier();
    }
  }, [currentUser, authLoading, router, plombierId]);

  const loadPlombier = async () => {
    try {
      const plombierDoc = await getDoc(doc(db, 'users', plombierId));
      if (!plombierDoc.exists()) {
        router.push('/plombiers');
        return;
      }
      
      const plombierData = {
        id: plombierDoc.id,
        ...plombierDoc.data(),
        createdAt: plombierDoc.data().createdAt?.toDate() || new Date(),
        updatedAt: plombierDoc.data().updatedAt?.toDate() || new Date(),
      } as User;

      if (plombierData.role !== 'plombier') {
        router.push('/plombiers');
        return;
      }

      setPlombier(plombierData);
      setFormData({
        name: plombierData.name || '',
        email: plombierData.email || '',
        phone: plombierData.phone || '',
        certified: !!plombierData.certified,
      });
    } catch (error) {
      console.error('Error loading plombier:', error);
      router.push('/plombiers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!plombier) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', plombier.id), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        certified: formData.certified,
        updatedAt: Timestamp.now(),
      });

      alert('Plombier mis à jour avec succès !');
      router.push('/plombiers');
    } catch (error: any) {
      console.error('Error updating plombier:', error);
      if (error.code === 'permission-denied') {
        alert('Erreur de permissions. Vous devez être admin pour modifier un plombier.');
      } else {
        alert(`Erreur lors de la mise à jour: ${error.message || 'Erreur inconnue'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!plombier) return;
    setValidating(true);
    try {
      await updateDoc(doc(db, 'users', plombier.id), {
        validationStatus: 'validated',
        validatedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      loadPlombier();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la validation');
    } finally {
      setValidating(false);
    }
  };

  const handleReject = async () => {
    if (!plombier || !confirm('Rejeter ce plombier ?')) return;
    setValidating(true);
    try {
      await updateDoc(doc(db, 'users', plombier.id), {
        validationStatus: 'rejected',
        updatedAt: Timestamp.now(),
      });
      loadPlombier();
    } catch (err) {
      console.error(err);
      alert('Erreur lors du rejet');
    } finally {
      setValidating(false);
    }
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

  if (!plombier) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="card text-center py-12">
            <p className="text-gray-600">Plombier introuvable</p>
            <Link href="/plombiers" className="btn btn-primary mt-4">
              Retour à la liste
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <Link 
            href="/plombiers" 
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-3 sm:mb-4"
          >
            <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Retour aux prestations plombiers</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Fiche plombier</h1>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="text-primary-600 w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{plombier.name}</h2>
              <p className="text-sm text-gray-600">{plombier.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="Nom du plombier"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input"
                placeholder="+212 6XX XXX XXX"
              />
            </div>

            {(plombier.nationalIdPhotoUrl || plombier.selfiePhotoUrl) && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900">Documents de validation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {plombier.nationalIdPhotoUrl && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Carte d&apos;identité nationale</p>
                      <img
                        src={plombier.nationalIdPhotoUrl}
                        alt="CNI"
                        className="w-full rounded-lg border border-gray-200 max-h-48 object-contain bg-white"
                      />
                    </div>
                  )}
                  {plombier.selfiePhotoUrl && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Selfie</p>
                      <img
                        src={plombier.selfiePhotoUrl}
                        alt="Selfie"
                        className="w-full rounded-lg border border-gray-200 max-h-48 object-contain bg-white"
                      />
                    </div>
                  )}
                </div>
                {plombier.validationStatus === 'documents_submitted' && (
                  <div className="flex gap-3 mt-4">
                    <button
                      type="button"
                      onClick={handleValidate}
                      disabled={validating}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Check size={18} />
                      Valider
                    </button>
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={validating}
                      className="btn btn-danger flex items-center gap-2"
                    >
                      <XCircle size={18} />
                      Rejeter
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="certified"
                checked={formData.certified}
                onChange={(e) => setFormData({ ...formData, certified: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="certified" className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <BadgeCheck className="w-4 h-4 text-primary-600" />
                Plombier certifié leplombier.ma
              </label>
            </div>
            <p className="text-xs text-gray-500 -mt-2">
              Le badge « certifié » est affiché au client lors du choix des offres.
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                <p>Rôle: <span className="font-medium text-primary-700">Plombier</span></p>
                <p className="mt-1">Créé le: {new Date(plombier.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="flex space-x-4">
                <Link href="/plombiers" className="btn btn-secondary">
                  Annuler
                </Link>
                <button 
                  type="submit" 
                  className="btn btn-primary flex items-center space-x-2"
                  disabled={saving}
                >
                  <Save size={18} />
                  <span>{saving ? 'Enregistrement...' : 'Enregistrer'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
