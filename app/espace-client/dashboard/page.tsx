'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClientAuth } from '@/hooks/useClientAuth';

export default function ClientDashboardPage() {
  const { token, loading } = useClientAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (token) {
      router.replace('/espace-client/commander');
    } else {
      router.replace('/espace-client/login');
    }
  }, [token, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
    </div>
  );
}
