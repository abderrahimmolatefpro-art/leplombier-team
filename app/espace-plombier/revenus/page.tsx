'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlombierAuth } from '@/hooks/usePlombierAuth';
import { DollarSign } from 'lucide-react';
import PlombierCardSkeleton from '@/components/PlombierCardSkeleton';
import PlombierStatsSkeleton from '@/components/PlombierStatsSkeleton';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function PlombierRevenusPage() {
  const { plombier, loading: authLoading } = usePlombierAuth();
  const router = useRouter();
  const [revenues, setRevenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        const snap = await getDocs(
          query(
            collection(db, 'manualRevenues'),
            where('plombierId', '==', plombier.id)
          )
        );
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            date: data.date?.toDate?.() || new Date(data.date),
          };
        });
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRevenues(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [plombier?.id]);

  const plombierPercent = 0.6;
  const companyPercent = 0.4;
  const totalRevenue = revenues.reduce((s, r) => s + (r.amount || 0), 0);
  const plombierShare = totalRevenue * plombierPercent;
  const companyShare = totalRevenue * companyPercent;
  const unpaid = revenues
    .filter((r) => !r.plombierHasPaid)
    .reduce((s, r) => s + (r.amount || 0) * companyPercent, 0);

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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg font-semibold text-gray-900">Mes revenus</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <>
            <div className="mb-8">
              <PlombierStatsSkeleton />
            </div>
            <h2 className="font-semibold text-gray-900 mb-4">Dépannages</h2>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <PlombierCardSkeleton key={i} />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3 mb-8">
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-500">Total dépannages</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-500">Ma part (60%)</p>
                <p className="text-xl font-bold text-primary-600">{formatCurrency(plombierShare)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-500">À régler à la société</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(unpaid)}</p>
              </div>
            </div>

            <h2 className="font-semibold text-gray-900 mb-4">Dépannages</h2>
            {revenues.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucun dépannage enregistré</p>
              </div>
            ) : (
              <div className="space-y-4">
                {revenues.map((r) => {
                  const myShare = (r.amount || 0) * plombierPercent;
                  const toPay = (r.amount || 0) * companyPercent;
                  return (
                    <div
                      key={r.id}
                      className="bg-white rounded-xl border border-gray-100 p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900">{r.description || 'Dépannage'}</p>
                          <p className="text-sm text-gray-500">{formatDate(r.date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(r.amount || 0)}</p>
                          <p className="text-sm text-primary-600">Ma part: {formatCurrency(myShare)}</p>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-sm">
                        <span className="text-gray-500">Part société: {formatCurrency(toPay)}</span>
                        {r.plombierHasPaid ? (
                          <span className="text-green-600 font-medium">Payé</span>
                        ) : (
                          <span className="text-amber-600 font-medium">À payer</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
