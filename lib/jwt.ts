import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
);

const EXPIRES_IN = '7d';

export interface ClientTokenPayload {
  clientId: string;
  phone: string;
  exp?: number;
}

export async function signClientToken(payload: ClientTokenPayload): Promise<string> {
  return new SignJWT({
    clientId: payload.clientId,
    phone: payload.phone,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(EXPIRES_IN)
    .sign(JWT_SECRET);
}

export async function verifyClientToken(token: string): Promise<ClientTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.clientId && payload.phone) {
      return {
        clientId: payload.clientId as string,
        phone: payload.phone as string,
        exp: payload.exp,
      };
    }
    return null;
  } catch {
    return null;
  }
}
