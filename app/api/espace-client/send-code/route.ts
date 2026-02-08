import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { normalizePhoneNumber } from '@/lib/phone';
import { FieldValue } from 'firebase-admin/firestore';
import * as crypto from 'crypto';

async function sendSmsViaInfobip(phone: string, message: string): Promise<boolean> {
  if (!process.env.INFOBIP_API_KEY || !process.env.INFOBIP_BASE_URL) {
    console.error('[send-code] Infobip not configured');
    return false;
  }

  const normalized = normalizePhoneNumber(phone);
  const baseUrl = process.env.INFOBIP_BASE_URL.startsWith('http')
    ? process.env.INFOBIP_BASE_URL
    : `https://${process.env.INFOBIP_BASE_URL}`;
  const apiUrl = `${baseUrl}/sms/2/text/advanced`;

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `App ${process.env.INFOBIP_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          destinations: [{ to: normalized }],
          from: process.env.INFOBIP_SENDER || 'Le Plombier',
          text: message,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error('[send-code] Infobip error:', res.status, await res.text());
    return false;
  }
  return true;
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ success: false, error: 'Numéro de téléphone requis' }, { status: 400 });
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

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const accessCodeHash = hashCode(code);

    await db.collection('clients').doc(clientDoc.id).update({
      accessCodeHash,
      accessCodeSentAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const message = `Votre code d'accès Le Plombier: ${code}. Utilisez ce code pour vous connecter.`;
    const sent = await sendSmsViaInfobip(phone, message);

    if (!sent) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de l\'envoi du SMS' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[send-code] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
