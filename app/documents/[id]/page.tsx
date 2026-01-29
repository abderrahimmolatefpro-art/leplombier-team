'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Document, Client, Project } from '@/types';
import DocumentView from '@/components/DocumentView';
import { companyInfo } from '@/lib/companyConfig';
import { generatePDFFromHTML } from '@/lib/pdfGenerator';

export default function DocumentViewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;
  const [document, setDocument] = useState<Document | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && documentId) {
      loadDocument();
    }
  }, [user, authLoading, router, documentId]);

  const loadDocument = async () => {
    try {
      const docRef = doc(db, 'documents', documentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        router.push('/documents');
        return;
      }

      const docData = {
        id: docSnap.id,
        ...docSnap.data(),
        date: docSnap.data().date?.toDate() || new Date(),
        dueDate: docSnap.data().dueDate?.toDate(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
        updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
      } as Document;

      setDocument(docData);

      // Load client
      if (docData.clientId) {
        const clientRef = doc(db, 'clients', docData.clientId);
        const clientSnap = await getDoc(clientRef);
        if (clientSnap.exists()) {
          setClient({
            id: clientSnap.id,
            ...clientSnap.data(),
            createdAt: clientSnap.data().createdAt?.toDate() || new Date(),
            updatedAt: clientSnap.data().updatedAt?.toDate() || new Date(),
          } as Client);
        }
      }

      // Load project
      if (docData.projectId) {
        const projectRef = doc(db, 'projects', docData.projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
          setProject({
            id: projectSnap.id,
            ...projectSnap.data(),
            startDate: projectSnap.data().startDate?.toDate() || new Date(),
            createdAt: projectSnap.data().createdAt?.toDate() || new Date(),
            updatedAt: projectSnap.data().updatedAt?.toDate() || new Date(),
          } as Project);
        }
      }
    } catch (error) {
      console.error('Error loading document:', error);
    } finally {
      setLoading(false);
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

  if (!document) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <p className="text-gray-500">Document introuvable</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <DocumentView
        document={document}
        client={client}
        project={project}
        companyInfo={companyInfo}
      />
    </Layout>
  );
}
