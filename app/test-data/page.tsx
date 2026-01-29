'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { collection, addDoc, setDoc, doc, Timestamp, getDocs, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { Plus, Users, UserPlus, CheckCircle } from 'lucide-react';

export default function TestDataPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string>('');

  // Données de test pour les plombiers
  const testPlombiers = [
    {
      name: 'Ahmed Benali',
      email: 'ahmed.benali@test.com',
      phone: '0612345678',
      password: 'test123456',
    },
    {
      name: 'Mohamed Alami',
      email: 'mohamed.alami@test.com',
      phone: '0623456789',
      password: 'test123456',
    },
    {
      name: 'Hassan Idrissi',
      email: 'hassan.idrissi@test.com',
      phone: '0634567890',
      password: 'test123456',
    },
  ];

  // Données de test pour les clients
  const testClients = [
    {
      name: 'Jean Dupont',
      email: 'jean.dupont@email.com',
      phone: '0611111111',
      address: '123 Rue Mohammed V',
      city: 'Casablanca',
      postalCode: '20000',
      clientType: 'particulier' as const,
      assignedPlombierId: '', // Sera assigné après création des plombiers
    },
    {
      name: 'SARL TechMaroc',
      email: 'contact@techmaroc.ma',
      phone: '0622222222',
      address: '456 Boulevard Zerktouni',
      city: 'Casablanca',
      postalCode: '20100',
      clientType: 'professionnel' as const,
      companyName: 'SARL TechMaroc',
      ice: '003755962000001',
      assignedPlombierId: '',
    },
    {
      name: 'Fatima Alaoui',
      email: 'fatima.alaoui@email.com',
      phone: '0633333333',
      address: '789 Avenue Hassan II',
      city: 'Rabat',
      postalCode: '10000',
      clientType: 'particulier' as const,
      assignedPlombierId: '',
    },
    {
      name: 'Restaurant Le Marocain',
      email: 'contact@lemarocain.ma',
      phone: '0644444444',
      address: '321 Rue de la Corniche',
      city: 'Casablanca',
      postalCode: '20000',
      clientType: 'professionnel' as const,
      companyName: 'Restaurant Le Marocain',
      ice: '003755962000002',
      assignedPlombierId: '',
    },
    {
      name: 'Omar Benjelloun',
      email: 'omar.benjelloun@email.com',
      phone: '0655555555',
      address: '654 Rue Allal Ben Abdellah',
      city: 'Marrakech',
      postalCode: '40000',
      clientType: 'particulier' as const,
      assignedPlombierId: '',
    },
  ];

  const createTestPlombiers = async () => {
    setLoading(true);
    setSuccess('');
    
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'test-data/page.tsx:97',message:'Starting createTestPlombiers',data:{plombiersCount:testPlombiers.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    try {
      const createdPlombiers: string[] = [];
      const errors: string[] = [];
      
      for (const plombier of testPlombiers) {
        try {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'test-data/page.tsx:105',message:'Attempting to create plombier',data:{name:plombier.name,email:plombier.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          
          // Créer l'utilisateur dans Firebase Auth
          const userCredential = await createUserWithEmailAndPassword(auth, plombier.email, plombier.password);
          const uid = userCredential.user.uid;
          
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'test-data/page.tsx:112',message:'Firebase Auth user created',data:{uid,email:plombier.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          
          // Créer le document dans Firestore avec l'UID comme ID
          await setDoc(doc(db, 'users', uid), {
            email: plombier.email,
            name: plombier.name,
            phone: plombier.phone,
            role: 'plombier',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
          
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'test-data/page.tsx:123',message:'Firestore document created successfully',data:{uid,name:plombier.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          
          createdPlombiers.push(uid);
        } catch (error: any) {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'test-data/page.tsx:128',message:'Error creating plombier',data:{name:plombier.name,email:plombier.email,errorCode:error?.code,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          
          console.error(`Erreur création ${plombier.name}:`, error);
          
          // Si l'utilisateur existe déjà dans Auth, essayer de créer juste le document Firestore
          if (error?.code === 'auth/email-already-in-use') {
            try {
              // #region agent log
              fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'test-data/page.tsx:135',message:'User already exists, trying to find UID',data:{email:plombier.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
              // #endregion
              
              // Chercher l'utilisateur existant dans Firestore
              const existingUserQuery = query(collection(db, 'users'), where('email', '==', plombier.email));
              const existingUserSnapshot = await getDocs(existingUserQuery);
              
              if (!existingUserSnapshot.empty) {
                const existingDoc = existingUserSnapshot.docs[0];
                // #region agent log
                fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'test-data/page.tsx:142',message:'Found existing user in Firestore',data:{uid:existingDoc.id,email:plombier.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                createdPlombiers.push(existingDoc.id);
                continue; // Passer au suivant
              }
              
              errors.push(`${plombier.name}: Email déjà utilisé mais document Firestore introuvable`);
            } catch (innerError: any) {
              // #region agent log
              fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'test-data/page.tsx:150',message:'Error finding existing user',data:{email:plombier.email,innerError:innerError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
              // #endregion
              errors.push(`${plombier.name}: ${error?.code || error?.message || 'Erreur inconnue'}`);
            }
          } else {
            errors.push(`${plombier.name}: ${error?.code || error?.message || 'Erreur inconnue'}`);
          }
        }
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'test-data/page.tsx:135',message:'createTestPlombiers completed',data:{createdCount:createdPlombiers.length,errorsCount:errors.length,errors},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      let successMsg = `${createdPlombiers.length} plombier(s) créé(s) avec succès !`;
      if (errors.length > 0) {
        successMsg += ` (${errors.length} erreur(s))`;
        // Afficher les erreurs dans une alerte séparée
        setTimeout(() => {
          alert(`Erreurs lors de la création des plombiers:\n\n${errors.join('\n')}`);
        }, 500);
      }
      setSuccess(successMsg);
      
      // Attendre un peu pour que les plombiers soient disponibles
      setTimeout(() => {
        createTestClients(createdPlombiers);
      }, 1000);
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'test-data/page.tsx:145',message:'Fatal error in createTestPlombiers',data:{errorCode:error?.code,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      console.error('Erreur:', error);
      alert(`Erreur lors de la création des plombiers: ${error?.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const createTestClients = async (plombierIds: string[] = []) => {
    try {
      // Récupérer les IDs des plombiers depuis Firestore
      const plombiersQuery = query(collection(db, 'users'), where('role', '==', 'plombier'));
      const plombiersSnapshot = await getDocs(plombiersQuery);
      const availablePlombierIds = plombiersSnapshot.docs.map(doc => doc.id);
      
      let createdCount = 0;
      
      for (let i = 0; i < testClients.length; i++) {
        const client = testClients[i];
        
        // Assigner un plombier de manière cyclique
        const assignedPlombierId = availablePlombierIds.length > 0 
          ? availablePlombierIds[i % availablePlombierIds.length]
          : '';
        
        try {
          await addDoc(collection(db, 'clients'), {
            ...client,
            assignedPlombierId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
          createdCount++;
        } catch (error) {
          console.error(`Erreur création client ${client.name}:`, error);
        }
      }
      
      setSuccess(prev => prev + ` ${createdCount} client(s) créé(s) avec succès !`);
    } catch (error) {
      console.error('Erreur création clients:', error);
    }
  };

  const createAllTestData = async () => {
    await createTestPlombiers();
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (!user || user.role !== 'admin') {
    router.push('/dashboard');
    return null;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Données de test</h1>
          <p className="text-gray-600 mt-2">Créer des plombiers et clients de test pour le développement</p>
        </div>

        {success && (
          <div className="card bg-green-50 border-green-200">
            <div className="flex items-center space-x-2 text-green-700">
              <CheckCircle size={20} />
              <span>{success}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plombiers de test */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <UserPlus className="mr-2" size={24} />
              Plombiers de test
            </h2>
            <div className="space-y-3 mb-4">
              {testPlombiers.map((plombier, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg">
                  <p className="font-medium text-gray-900">{plombier.name}</p>
                  <p className="text-sm text-gray-600">{plombier.email}</p>
                  <p className="text-xs text-gray-500">{plombier.phone}</p>
                </div>
              ))}
            </div>
            <button
              onClick={createTestPlombiers}
              disabled={loading}
              className="btn btn-primary w-full flex items-center justify-center space-x-2"
            >
              <Plus size={20} />
              <span>Créer les plombiers</span>
            </button>
          </div>

          {/* Clients de test */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Users className="mr-2" size={24} />
              Clients de test
            </h2>
            <div className="space-y-3 mb-4">
              {testClients.map((client, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg">
                  <p className="font-medium text-gray-900">{client.name}</p>
                  <p className="text-sm text-gray-600">{client.email}</p>
                  <p className="text-xs text-gray-500">
                    {client.city} • {client.clientType === 'professionnel' ? 'Pro' : 'Particulier'}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={() => createTestClients()}
              disabled={loading}
              className="btn btn-primary w-full flex items-center justify-center space-x-2"
            >
              <Plus size={20} />
              <span>Créer les clients</span>
            </button>
          </div>
        </div>

        {/* Bouton tout créer */}
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Créer toutes les données de test</h3>
              <p className="text-sm text-gray-600 mt-1">
                Crée d&apos;abord les plombiers, puis les clients avec assignation automatique
              </p>
            </div>
            <button
              onClick={createAllTestData}
              disabled={loading}
              className="btn btn-primary flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Création...</span>
                </>
              ) : (
                <>
                  <Plus size={20} />
                  <span>Tout créer</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
