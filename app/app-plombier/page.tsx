'use client';

import Image from 'next/image';
import Link from 'next/link';

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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Télécharger l&apos;application
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Disponible prochainement sur Android et iOS.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {/* Placeholder pour liens APK / App Store quand disponibles */}
              {/* <a href="..." className="btn btn-outline">Android (APK)</a> */}
              {/* <a href="..." className="btn btn-outline">App Store</a> */}
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-8">
            Connectez-vous avec votre téléphone et le mot de passe communiqué par SMS.
          </p>
        </div>
      </div>
    </div>
  );
}
