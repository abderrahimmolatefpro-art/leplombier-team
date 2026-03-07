'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePlombierAuth } from '@/hooks/usePlombierAuth';
import { Package, Plus, X } from 'lucide-react';
import PlombierCardSkeleton from '@/components/PlombierCardSkeleton';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PartRequest, PartRequestUrgency } from '@/types';
import { formatDate } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
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

interface InterventionOption {
  type: 'project' | 'depannage';
  id: string;
  clientId: string;
  label: string;
}

export default function PlombierDemandesPiecesPage() {
  const t = useTranslations('plumber.demandesPieces');
  const tCommon = useTranslations('common');
  const { plombier, loading: authLoading } = usePlombierAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<PartRequest[]>([]);
  const [interventions, setInterventions] = useState<InterventionOption[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    interventionType: '' as 'project' | 'depannage' | '',
    interventionId: '',
    clientId: '',
    description: '',
    quantity: '',
    urgency: 'normal' as PartRequestUrgency,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !plombier) {
      router.replace('/espace-plombier/login');
      return;
    }
  }, [authLoading, plombier, router]);

  useEffect(() => {
    if (!plombier?.id) return;

    const load = async () => {
      try {
        const [projectsSnap, revenuesSnap, requestsSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, 'projects'),
              where('plombierIds', 'array-contains', plombier.id)
            )
          ),
          getDocs(
            query(
              collection(db, 'manualRevenues'),
              where('plombierId', '==', plombier.id)
            )
          ),
          getDocs(
            query(
              collection(db, 'partRequests'),
              where('plombierId', '==', plombier.id)
            )
          ),
        ]);

        const projects = projectsSnap.docs
          .filter((d) => d.data().status !== 'annule')
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              startDate: data.startDate?.toDate?.() || null,
            };
          });
        const revenues = revenuesSnap.docs
          .filter((d) => !d.data().deleted)
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              date: data.date?.toDate?.() || new Date(data.date),
            };
          });

        const clientIds = new Set<string>();
        const opts: InterventionOption[] = [];

        projects.forEach((p: any) => {
          clientIds.add(p.clientId);
          opts.push({
            type: 'project',
            id: p.id,
            clientId: p.clientId,
            label: `Projet: ${p.title || 'Sans titre'} - ${formatDate(p.startDate)}`,
          });
        });
        revenues.forEach((r: any) => {
          clientIds.add(r.clientId);
          const fullDesc = r.description || 'Dépannage';
          const desc = fullDesc.slice(0, 50);
          opts.push({
            type: 'depannage',
            id: r.id,
            clientId: r.clientId,
            label: `Dépannage: ${desc}${fullDesc.length > 50 ? '...' : ''} - ${formatDate(r.date)}`,
          });
        });

        opts.sort((a, b) => {
          const aLabel = a.label;
          const bLabel = b.label;
          return bLabel.localeCompare(aLabel);
        });

        setInterventions(opts);

        const clientMap: Record<string, string> = {};
        for (const cid of clientIds) {
          const cDoc = await getDoc(doc(db, 'clients', cid));
          if (cDoc.exists()) clientMap[cid] = cDoc.data().name || 'Client';
        }
        setClients(clientMap);

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
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [plombier?.id]);

  const openModal = () => {
    setFormData({
      interventionType: '',
      interventionId: '',
      clientId: '',
      description: '',
      quantity: '',
      urgency: 'normal',
    });
    setShowModal(true);
  };

  const handleInterventionSelect = (opt: InterventionOption) => {
    setFormData((p) => ({
      ...p,
      interventionType: opt.type,
      interventionId: opt.id,
      clientId: opt.clientId,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plombier?.id) return;
    if (!formData.interventionType || !formData.interventionId || !formData.clientId) {
      alert(t('selectIntervention'));
      return;
    }
    if (!formData.description.trim()) {
      alert(t('describeParts'));
      return;
    }

    setSubmitting(true);
    try {
      const now = Timestamp.now();
      const payload: Record<string, unknown> = {
        plombierId: plombier.id,
        clientId: formData.clientId,
        description: formData.description.trim(),
        quantity: formData.quantity.trim() || undefined,
        urgency: formData.urgency,
        status: 'en_attente',
        createdAt: now,
        updatedAt: now,
      };
      if (formData.interventionType === 'project') {
        payload.projectId = formData.interventionId;
      } else {
        payload.manualRevenueId = formData.interventionId;
      }

      await addDoc(collection(db, 'partRequests'), payload);
      setShowModal(false);
      setLoading(true);
      const requestsSnap = await getDocs(
        query(
          collection(db, 'partRequests'),
          where('plombierId', '==', plombier.id)
        )
      );
      const requestsData = requestsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        } as PartRequest;
      });
      requestsData.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      setRequests(requestsData);
    } catch (err) {
      console.error(err);
      alert(t('errorCreate'));
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  if (authLoading || !plombier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">{t('title')}</h1>
          <button onClick={openModal} className="btn btn-primary flex items-center gap-2 text-sm py-2">
            <Plus size={18} />
            {t('newRequest')}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <PlombierCardSkeleton key={i} />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">{t('noRequests')}</p>
            <button onClick={openModal} className="btn btn-primary">
              {t('createRequest')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-gray-100 p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900 line-clamp-2">{r.description}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {clients[r.clientId] || '—'} • {formatDate(r.createdAt)}
                    </p>
                    {r.quantity && (
                      <p className="text-sm text-gray-600 mt-0.5">{t('quantity')}: {r.quantity}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        r.urgency === 'tres_urgent'
                          ? 'bg-red-100 text-red-700'
                          : r.urgency === 'urgent'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {r.urgency === 'normal' ? t('normal') : r.urgency === 'urgent' ? t('urgent') : t('tresUrgent')}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        r.status === 'en_attente'
                          ? 'bg-yellow-100 text-yellow-700'
                          : r.status === 'envoye'
                          ? 'bg-blue-100 text-blue-700'
                          : r.status === 'recupere' || r.status === 'facture'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {r.status === 'en_attente' ? t('en_attente') : r.status === 'envoye' ? t('envoye') : r.status === 'recupere' || r.status === 'facture' ? t('recupere') : r.status === 'rejete' ? t('rejete') : r.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t('modalTitle')}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('intervention')} *</label>
                <select
                  required
                  value={
                    formData.interventionType && formData.interventionId
                      ? `${formData.interventionType}:${formData.interventionId}`
                      : ''
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) {
                      setFormData((p) => ({ ...p, interventionType: '', interventionId: '', clientId: '' }));
                      return;
                    }
                    const [type, id] = v.split(':');
                    const opt = interventions.find((i) => i.type === type && i.id === id);
                    if (opt) handleInterventionSelect(opt);
                  }}
                  className="input w-full"
                >
                  <option value="">{t('selectInterventionOption')}</option>
                  {interventions.map((opt) => (
                    <option key={`${opt.type}-${opt.id}`} value={`${opt.type}:${opt.id}`}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {interventions.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    {t('noInterventions')}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('partsRequested')} *</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="input w-full"
                  rows={3}
                  placeholder={t('partsPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('quantityOptional')}</label>
                <input
                  type="text"
                  value={formData.quantity}
                  onChange={(e) => setFormData((p) => ({ ...p, quantity: e.target.value }))}
                  className="input w-full"
                  placeholder={t('quantityPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('urgency')}</label>
                <select
                  value={formData.urgency}
                  onChange={(e) => setFormData((p) => ({ ...p, urgency: e.target.value as PartRequestUrgency }))}
                  className="input w-full"
                >
                  <option value="normal">{t('normal')}</option>
                  <option value="urgent">{t('urgent')}</option>
                  <option value="tres_urgent">{t('tresUrgent')}</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                  {tCommon('cancel')}
                </button>
                <button type="submit" disabled={submitting || interventions.length === 0} className="btn btn-primary flex-1">
                  {submitting ? t('sending') : t('sendRequest')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
