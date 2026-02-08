import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { normalizePhoneNumber } from '@/lib/phone';
import { signClientToken } from '@/lib/jwt';
import * as crypto from 'crypto';

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();
    if (!phone || !code || typeof phone !== 'string' || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Téléphone et code requis' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const normalizedInput = normalizePhoneNumber(phone);

    const snapshot = await db.collection('clients').get();
    const clientDoc = snapshot.docs.find((d) => {
      const p = (d.data().phone || '').toString().trim();
      return normalizePhoneNumber(p) === normalizedInput;
    });

    if (!clientDoc) {
      return NextResponse.json({ success: false, error: 'Numéro non reconnu' }, { status: 404 });
    }

    const data = clientDoc.data();
    const storedHash = data.accessCodeHash;

    if (!storedHash) {
      return NextResponse.json(
        { success: false, error: "Aucun code envoyé. Cliquez sur 'Envoyer le code' pour en recevoir un." },
        { status: 400 }
      );
    }

    const codeDigits = code.trim().replace(/\D/g, '');
    const codeHashToVerify = hashCode(codeDigits);

    if (storedHash !== codeHashToVerify) {
      return NextResponse.json({ success: false, error: 'Code incorrect. Vérifiez le code reçu par SMS.' }, { status: 401 });
    }

    const token = await signClientToken({
      clientId: clientDoc.id,
      phone: normalizedInput,
    });

    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error('[verify] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
