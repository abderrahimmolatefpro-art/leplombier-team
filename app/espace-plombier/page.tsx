'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePlombierAuth } from '@/hooks/usePlombierAuth';

export default function EspacePlombierPage() {
  const { plombier, loading } = usePlombierAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (plombier) {
      router.replace('/espace-plombier/dashboard');
    } else {
      router.replace('/espace-plombier/login');
    }
  }, [plombier, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
    </div>
  );
}
