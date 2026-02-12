'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types';

export function usePlombierAuth() {
  const [plombier, setPlombier] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === 'plombier') {
              const createdAt = userData.createdAt?.toDate?.() ?? new Date();
              const updatedAt = userData.updatedAt?.toDate?.() ?? new Date();
              setPlombier({
                id: userDoc.id,
                ...userData,
                createdAt,
                updatedAt,
              } as User);
            } else {
              await signOut(auth);
              setPlombier(null);
            }
          } else {
            await signOut(auth);
            setPlombier(null);
          }
        } catch (error) {
          console.error('Error fetching plombier data:', error);
          setPlombier(null);
        }
      } else {
        setPlombier(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.role !== 'plombier') {
        await signOut(auth);
        throw new Error('Ce compte n\'est pas un compte plombier.');
      }
    } else {
      await signOut(auth);
      throw new Error('Compte non trouvé.');
    }
  };

  const logout = async () => {
    await signOut(auth);
    setPlombier(null);
  };

  return {
    plombier,
    loading,
    login,
    logout,
  };
}
