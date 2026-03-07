import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { normalizePhoneNumber } from '@/lib/phone';

/**
 * Vérifie si un code a déjà été envoyé à ce numéro.
 * Utilisé par la page de connexion pour adapter l'affichage.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { phone, country: bodyCountry } = body;
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ codeSent: false }, { status: 200 });
    }

    const country = bodyCountry === 'ES' ? 'ES' : (request.headers.get('host')?.includes('leplombier.es') ? 'ES' : 'MA');

    const db = getAdminDb();
    const normalizedInput = normalizePhoneNumber(phone, country);

    let snapshot = await db.collection('clients').where('country', '==', country).get();
    let clientDoc = snapshot.docs.find((d) => {
      const p = (d.data().phone || '').toString().trim();
      return normalizePhoneNumber(p, country) === normalizedInput;
    });
    if (!clientDoc && country === 'MA') {
      snapshot = await db.collection('clients').get();
      clientDoc = snapshot.docs.find((d) => {
        const data = d.data();
        if (data.country && data.country !== 'MA') return false;
        const p = (data.phone || '').toString().trim();
        return normalizePhoneNumber(p, 'MA') === normalizedInput;
      });
    }

    const codeSent = !!(clientDoc?.data()?.accessCodeSentAt);

    return NextResponse.json({ codeSent });
  } catch (error) {
    console.error('[check-code-sent] Error:', error);
    return NextResponse.json({ codeSent: false }, { status: 200 });
  }
}
