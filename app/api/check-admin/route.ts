import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

/**
 * Vérifie si au moins un admin existe (pour la page d'accueil et setup).
 * Utilise l'Admin SDK pour contourner les règles Firestore.
 * Pas d'auth requise - retourne uniquement un booléen.
 */
export async function GET() {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection('users').where('role', '==', 'admin').limit(1).get();
    const hasAdmin = !snapshot.empty;
    return NextResponse.json({ hasAdmin });
  } catch (error) {
    console.error('[check-admin] Error:', error);
    // En cas d'erreur (ex: Firebase Admin non configuré), on suppose qu'un admin existe
    // pour éviter de rediriger vers /setup à tort
    return NextResponse.json({ hasAdmin: true }, { status: 200 });
  }
}
