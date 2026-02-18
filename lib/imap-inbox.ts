/**
 * Client IMAP partagé pour réutiliser la connexion entre requêtes.
 * Évite de reconnecter à chaque chargement (liste + contenu email).
 */
import { ImapFlow } from 'imapflow';

const IMAP_TIMEOUT_MS = 12000;
const IDLE_MAX_MS = 5 * 60 * 1000; // Fermer après 5 min d'inactivité

let sharedClient: ImapFlow | null = null;
let lastUsedAt = 0;
let connectPromise: Promise<ImapFlow> | null = null;

function getConfig() {
  const host = process.env.IMAP_INBOX_HOST || 'premium239.web-hosting.com';
  const port = parseInt(process.env.IMAP_INBOX_PORT || '993');
  const user = process.env.IMAP_INBOX_USER || 'contact@leplombier.ma';
  const pass = process.env.IMAP_INBOX_PASS;
  return { host, port, user, pass };
}

async function connect(): Promise<ImapFlow> {
  const { host, port, user, pass } = getConfig();
  if (!pass) throw new Error('IMAP_INBOX_PASS non configuré');

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass },
  });

  await Promise.race([
    client.connect(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connexion IMAP expirée')), IMAP_TIMEOUT_MS)
    ),
  ]);

  client.on('close', () => {
    sharedClient = null;
    connectPromise = null;
  });
  client.on('error', () => {
    sharedClient = null;
    connectPromise = null;
  });

  return client;
}

export async function getImapClient(): Promise<ImapFlow> {
  const { pass } = getConfig();
  if (!pass) throw new Error('IMAP_INBOX_PASS non configuré');

  const now = Date.now();
  if (sharedClient && sharedClient.usable) {
    if (now - lastUsedAt > IDLE_MAX_MS) {
      try {
        await sharedClient.logout();
      } catch {
        // ignore
      }
      sharedClient = null;
      connectPromise = null;
    } else {
      lastUsedAt = now;
      return sharedClient;
    }
  }

  if (connectPromise) {
    const client = await connectPromise;
    if (client.usable) {
      lastUsedAt = now;
      return client;
    }
    connectPromise = null;
  }

  connectPromise = connect();
  sharedClient = await connectPromise;
  lastUsedAt = now;
  return sharedClient;
}

export function releaseImapClient(): void {
  // Ne pas déconnecter - garder pour réutilisation
  // La connexion sera fermée après IDLE_MAX_MS ou en cas d'erreur
}
