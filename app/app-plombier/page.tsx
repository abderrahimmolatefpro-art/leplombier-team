'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Smartphone, Download } from 'lucide-react';

const APK_URL = process.env.NEXT_PUBLIC_APP_PLOMBIER_APK_URL || '/Leplombier-PRO.apk';

export default function AppPlombierPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.png"
              alt="Le Plombier"
              width={180}
              height={60}
              className="h-auto object-contain"
              priority
            />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Espace Plombier - Le Plombier
          </h1>
          <p className="text-gray-600 mb-8">
            Bienvenue ! Accédez à votre espace professionnel pour gérer vos interventions et projets.
          </p>

          <Link
            href="/espace-plombier/login"
            className="inline-flex items-center justify-center w-full py-3 px-6 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors mb-8"
          >
            Accéder à votre espace
          </Link>

          <div className="border-t border-gray-200 pt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center justify-center gap-2">
              <Smartphone size={22} />
              Télécharger l&apos;application Android
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Installez l&apos;app sur votre téléphone pour un accès rapide à votre espace plombier.
            </p>
            <a
              href={APK_URL}
              download="Leplombier-PRO.apk"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors border border-green-700"
            >
              <Download size={20} />
              Télécharger pour Android
            </a>
            <p className="text-xs text-gray-500 mt-3">
              iOS : disponible prochainement
            </p>
          </div>

          <p className="text-sm text-gray-500 mt-8">
            Connectez-vous avec votre téléphone et le mot de passe communiqué par SMS.
          </p>
        </div>
      </div>
    </div>
  );
}
