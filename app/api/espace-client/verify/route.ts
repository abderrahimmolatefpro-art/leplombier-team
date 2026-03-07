import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { normalizePhoneNumber } from '@/lib/phone';
import { signClientToken } from '@/lib/jwt';
import { getApiMessage } from '@/lib/apiMessages';
import * as crypto from 'crypto';

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code, country: bodyCountry } = body;
    const country = bodyCountry === 'ES' ? 'ES' : (request.headers.get('host')?.includes('leplombier.es') ? 'ES' : 'MA');

    if (!phone || !code || typeof phone !== 'string' || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: getApiMessage('PHONE_CODE_REQUIRED', country) },
        { status: 400 }
      );
    }

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

    if (!clientDoc) {
      return NextResponse.json({ success: false, error: getApiMessage('PHONE_NOT_FOUND', country) }, { status: 404 });
    }

    const data = clientDoc.data();
    const storedHash = data.accessCodeHash;

    if (!storedHash) {
      return NextResponse.json(
        { success: false, error: getApiMessage('NO_CODE_SENT', country) },
        { status: 400 }
      );
    }

    const codeDigits = code.trim().replace(/\D/g, '');
    const codeHashToVerify = hashCode(codeDigits);

    if (storedHash !== codeHashToVerify) {
      return NextResponse.json({ success: false, error: getApiMessage('INVALID_CODE', country) }, { status: 401 });
    }

    const token = await signClientToken({
      clientId: clientDoc.id,
      phone: normalizedInput,
    });

    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error('[verify] Error:', error);
    const country = request.headers.get('host')?.includes('leplombier.es') ? 'ES' : 'MA';
    return NextResponse.json(
      { success: false, error: getApiMessage('SERVER_ERROR', country) },
      { status: 500 }
    );
  }
}
