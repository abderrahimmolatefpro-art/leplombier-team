'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClientAuth } from '@/hooks/useClientAuth';
import DocumentView from '@/components/DocumentView';
import { companyInfo } from '@/lib/companyConfig';
import { Document, Client, Project } from '@/types';
import { ArrowLeft } from 'lucide-react';

export default function ClientDocumentViewPage() {
  const { token, loading: authLoading } = useClientAuth();
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;
  const [document, setDocument] = useState<Document | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/espace-client/login');
      return;
    }
    if (token && documentId) {
      fetch(`/api/espace-client/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Not found');
          return res.json();
        })
        .then((data) => {
          const doc = data.document;
          const c = data.client;
          const p = data.project;
          setDocument({
            ...doc,
            date: doc.date ? new Date(doc.date) : new Date(),
            dueDate: doc.dueDate ? new Date(doc.dueDate) : undefined,
            createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
            updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
          } as Document);
          setClient(
            c
              ? {
                  ...c,
                  createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
                  updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
                }
              : null
          );
          setProject(
            p
              ? {
                  ...p,
                  startDate: p.startDate ? new Date(p.startDate) : new Date(),
                  endDate: p.endDate ? new Date(p.endDate) : undefined,
                  createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
                  updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
                }
              : null
          );
        })
        .catch(() => setDocument(null))
        .finally(() => setLoading(false));
    }
  }, [token, authLoading, router, documentId]);

  if (authLoading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/espace-client/documents"
            className="inline-flex items-center gap-2 text-primary-600 hover:underline mb-4"
          >
            <ArrowLeft size={18} />
            Retour aux documents
          </Link>
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-gray-500">Document introuvable</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link
            href="/espace-client/documents"
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">
            {document.type} {document.number}
          </h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <DocumentView
          document={document}
          client={client}
          project={project}
          companyInfo={companyInfo}
        />
      </main>
    </div>
  );
}
