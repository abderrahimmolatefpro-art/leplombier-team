'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCountry } from '@/contexts/CountryContext';
import Layout from '@/components/Layout';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Client } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Briefcase, ChevronDown, ChevronRight, Users, DollarSign, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface PartnerWithReferred {
  partner: Client;
  referredClients: (Client & { totalInvoiced: number })[];
  totalInvoiced: number;
}

export default function PartenairesPage() {
  const { user, loading: authLoading } = useAuth();
  const { countryFilter } = useCountry();
  const router = useRouter();
  const [partners, setPartners] = useState<PartnerWithReferred[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadPartners();
    }
  }, [user, authLoading, router, countryFilter]);

  const loadPartners = async () => {
    try {
      // Charger les clients PRO (filtrés par pays)
      const clientsQuery = query(
        collection(db, 'clients'),
        where('clientType', '==', 'professionnel'),
        where('country', 'in', countryFilter)
      );
      const clientsSnapshot = await getDocs(clientsQuery);
      const proClients = clientsSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || new Date(),
      })) as Client[];

      // Pour chaque PRO : charger les clients parrainés et leur total facturé
      const partnersData: PartnerWithReferred[] = await Promise.all(
        proClients.map(async (partner) => {
          const referredQuery = query(
            collection(db, 'clients'),
            where('referredByClientId', '==', partner.id)
          );
          const referredSnapshot = await getDocs(referredQuery);
          const referredData = referredSnapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toDate() || new Date(),
            updatedAt: d.data().updatedAt?.toDate() || new Date(),
          })) as Client[];

          // Calculer le total facturé pour chaque client parrainé
          const referredWithTotals = await Promise.all(
            referredData.map(async (refClient) => {
              const docsQuery = query(
                collection(db, 'documents'),
                where('clientId', '==', refClient.id),
                where('type', '==', 'facture')
              );
              const docsSnap = await getDocs(docsQuery);
              let totalInvoiced = 0;
              docsSnap.docs.forEach((d) => {
                totalInvoiced += (d.data().total as number) || 0;
              });
              return { ...refClient, totalInvoiced };
            })
          );

          const totalInvoiced = referredWithTotals.reduce((sum, c) => sum + c.totalInvoiced, 0);

          return {
            partner,
            referredClients: referredWithTotals,
            totalInvoiced,
          };
        })
      );

      // Trier : d'abord ceux qui ont des clients parrainés, puis par total facturé décroissant
      partnersData.sort((a, b) => {
        if (a.referredClients.length === 0 && b.referredClients.length === 0) return 0;
        if (a.referredClients.length === 0) return 1;
        if (b.referredClients.length === 0) return -1;
        return b.totalInvoiced - a.totalInvoiced;
      });

      setPartners(partnersData);
    } catch (error) {
      console.error('Error loading partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalReferred = partners.reduce((sum, p) => sum + p.referredClients.length, 0);
  const totalInvoicedAll = partners.reduce((sum, p) => sum + p.totalInvoiced, 0);

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
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase size={28} className="text-primary-600" />
            Partenaires
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
            Clients PRO et leurs clients parrainés • {partners.length} partenaire{partners.length > 1 ? 's' : ''} • {totalReferred} client{totalReferred > 1 ? 's' : ''} parrainé{totalReferred > 1 ? 's' : ''}
          </p>
        </div>

        {/* Résumé global */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="card flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary-50">
              <Users className="text-primary-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Clients parrainés</p>
              <p className="text-xl font-bold text-gray-900">{totalReferred}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-50">
              <DollarSign className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total facturé</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalInvoicedAll)}</p>
            </div>
          </div>
        </div>

        {/* Liste des partenaires */}
        <div className="space-y-3">
          {partners.map(({ partner, referredClients, totalInvoiced }) => {
            const isExpanded = expandedIds.has(partner.id);
            const hasReferred = referredClients.length > 0;

            return (
              <div key={partner.id} className="card">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => hasReferred && toggleExpand(partner.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {hasReferred ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(partner.id);
                        }}
                        className="p-1 rounded hover:bg-gray-100 text-gray-500"
                      >
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </button>
                    ) : (
                      <span className="w-7" />
                    )}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/clients/${partner.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-gray-900 hover:text-primary-600 hover:underline flex items-center gap-1"
                      >
                        {partner.companyName || partner.name}
                        <ExternalLink size={14} className="text-gray-400" />
                      </Link>
                      {partner.companyName && partner.name !== partner.companyName && (
                        <p className="text-sm text-gray-500 truncate">{partner.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Clients ramenés</p>
                        <p className="font-semibold text-gray-900">{referredClients.length}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Total facturé</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(totalInvoiced)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && hasReferred && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <ul className="space-y-2">
                      {referredClients.map((refClient) => (
                        <li
                          key={refClient.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100"
                        >
                          <Link
                            href={`/clients/${refClient.id}`}
                            className="font-medium text-primary-600 hover:underline flex items-center gap-1"
                          >
                            {refClient.name}
                            <ExternalLink size={14} />
                          </Link>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(refClient.totalInvoiced)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {partners.length === 0 && (
          <div className="card text-center py-12">
            <Briefcase size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun client professionnel pour le moment.</p>
            <p className="text-sm text-gray-400 mt-1">
              Les clients parrainés apparaîtront ici une fois associés à un client PRO.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
