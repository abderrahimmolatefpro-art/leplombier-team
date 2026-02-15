'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { usePlombierAuth } from '@/hooks/usePlombierAuth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { FileImage, Upload, ArrowLeft, LogOut } from 'lucide-react';

export default function PlombierDocumentsPage() {
  const { plombier, loading, logout } = usePlombierAuth();
  const router = useRouter();
  const [nationalIdFile, setNationalIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [nationalIdPreview, setNationalIdPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const nationalIdInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !plombier) {
      router.replace('/espace-plombier/login');
    }
  }, [loading, plombier, router]);

  useEffect(() => {
    if (!plombier) return;
    const status = plombier.validationStatus;
    if (status === 'validated' || status === 'rejected') {
      router.replace('/espace-plombier/dashboard');
    }
  }, [plombier, router]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'nationalId' | 'selfie'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image (JPG, PNG)');
      return;
    }
    setError('');
    const url = URL.createObjectURL(file);
    if (type === 'nationalId') {
      setNationalIdPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setNationalIdFile(file);
    } else {
      setSelfiePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setSelfieFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plombier?.id) return;
    if (!nationalIdFile || !selfieFile) {
      setError('Veuillez fournir les deux photos (carte nationale et selfie)');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const nationalIdRef = ref(storage, `plombiers/${plombier.id}/nationalId.jpg`);
      const selfieRef = ref(storage, `plombiers/${plombier.id}/selfie.jpg`);

      await uploadBytes(nationalIdRef, nationalIdFile);
      await uploadBytes(selfieRef, selfieFile);

      const nationalIdUrl = await getDownloadURL(nationalIdRef);
      const selfieUrl = await getDownloadURL(selfieRef);

      await updateDoc(doc(db, 'users', plombier.id), {
        nationalIdPhotoUrl: nationalIdUrl,
        selfiePhotoUrl: selfieUrl,
        validationStatus: 'documents_submitted',
        documentsSubmittedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      router.push('/espace-plombier/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erreur lors de l\'envoi des documents');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !plombier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const status = plombier.validationStatus;
  const isSubmitted = status === 'documents_submitted';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Link
            href="/espace-plombier/dashboard"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            Retour
          </Link>
          <div className="flex-1 flex justify-center">
            <Image src="/logo.png" alt="Le Plombier" width={120} height={40} className="h-8 w-auto" />
          </div>
          <button
            onClick={() => {
              logout();
              router.replace('/espace-plombier/login');
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Documents de validation</h1>
        <p className="text-gray-600 mb-8">
          Pour finaliser votre inscription, veuillez fournir une photo de votre carte d&apos;identité
          nationale et un selfie.
        </p>

        {isSubmitted && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            Vos documents ont été soumis. En attente de validation par l&apos;administrateur.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo carte d&apos;identité nationale
            </label>
            <input
              ref={nationalIdInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'nationalId')}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => nationalIdInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-primary-400 hover:bg-primary-50/50 transition-colors"
            >
              {nationalIdPreview ? (
                <img
                  src={nationalIdPreview}
                  alt="Aperçu carte nationale"
                  className="max-h-32 rounded-lg object-contain"
                />
              ) : (
                <>
                  <FileImage className="w-12 h-12 text-gray-400" />
                  <span className="text-sm text-gray-600">Cliquez pour sélectionner une image</span>
                </>
              )}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photo selfie</label>
            <input
              ref={selfieInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'selfie')}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => selfieInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-primary-400 hover:bg-primary-50/50 transition-colors"
            >
              {selfiePreview ? (
                <img
                  src={selfiePreview}
                  alt="Aperçu selfie"
                  className="max-h-32 rounded-lg object-contain"
                />
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400" />
                  <span className="text-sm text-gray-600">Cliquez pour sélectionner une image</span>
                </>
              )}
            </button>
          </div>

          {!isSubmitted && (
            <button
              type="submit"
              disabled={submitting || !nationalIdFile || !selfieFile}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              {submitting ? 'Envoi en cours...' : 'Soumettre'}
            </button>
          )}
        </form>
      </main>
    </div>
  );
}
