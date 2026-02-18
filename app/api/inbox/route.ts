import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { getImapClient } from '@/lib/imap-inbox';

const INBOX_LIMIT = 15;

export interface InboxEmail {
  uid: number;
  subject: string;
  from: string;
  fromAddress: string;
  date: string;
  seen: boolean;
}

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { error: 'Non autorisé', status: 401 };

  let app;
  try {
    app = getAdminApp();
  } catch {
    return { error: 'Configuration Firebase manquante.', status: 500 };
  }

  let decodedToken: { uid: string };
  try {
    decodedToken = await getAuth(app).verifyIdToken(token);
  } catch {
    return { error: 'Token invalide ou expiré', status: 401 };
  }

  const db = getAdminDb();
  const userDoc = await db.collection('users').doc(decodedToken.uid).get();
  if (!userDoc.exists) return { error: 'Utilisateur non trouvé', status: 403 };

  const role = userDoc.data()?.role;
  if (role !== 'admin' && role !== 'Admin') {
    return { error: 'Droits administrateur requis', status: 403 };
  }

  return null;
}

export async function GET(request: NextRequest) {
  const authError = await verifyAdmin(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const host = process.env.IMAP_INBOX_HOST || 'premium239.web-hosting.com';
  const port = parseInt(process.env.IMAP_INBOX_PORT || '993');
  const user = process.env.IMAP_INBOX_USER || 'contact@leplombier.ma';
  const pass = process.env.IMAP_INBOX_PASS;

  if (!pass) {
    return NextResponse.json(
      { error: 'Boîte mail non configurée. Définissez IMAP_INBOX_PASS dans les variables d\'environnement.' },
      { status: 503 }
    );
  }

  try {
    const client = await getImapClient();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const mailbox = client.mailbox;
      const total = mailbox && typeof mailbox === 'object' ? mailbox.exists : 0;
      if (total === 0) {
        return NextResponse.json({ emails: [], total: 0 });
      }

      const start = Math.max(1, total - INBOX_LIMIT + 1);
      const messages = await client.fetchAll(`${start}:*`, {
        envelope: true,
        flags: true,
      });

      const emails: InboxEmail[] = messages.map((msg) => {
        const from = msg.envelope?.from?.[0];
        const fromStr: string = from
          ? (from.name ? `${from.name} <${from.address || ''}>` : from.address) || 'Inconnu'
          : 'Inconnu';
        const fromAddress = from?.address || '';

        return {
          uid: msg.uid,
          subject: msg.envelope?.subject || '(Sans objet)',
          from: fromStr,
          fromAddress,
          date: msg.envelope?.date?.toISOString() || new Date().toISOString(),
          seen: msg.flags?.has('\\Seen') ?? true,
        };
      });

      return NextResponse.json({ emails, total });
    } finally {
      lock.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/inbox] IMAP error:', message);
    return NextResponse.json(
      { error: `Impossible de récupérer les emails: ${message}` },
      { status: 500 }
    );
  }
}
