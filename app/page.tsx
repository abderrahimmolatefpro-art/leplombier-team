'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAndRedirect = async () => {
      if (loading) return;

      if (user) {
        router.push('/dashboard');
        return;
      }

      // Vérifier s'il y a un admin (via API pour éviter les règles Firestore)
      try {
        const res = await fetch('/api/check-admin');
        const data = await res.json();
        const hasAdmin = data.hasAdmin === true;

        if (!hasAdmin) {
          router.push('/setup');
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error checking admin:', error);
        router.push('/login');
      } finally {
        setChecking(false);
      }
    };

    checkAndRedirect();
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );
}
