// Edge-safe (Web Crypto) HMAC signing/verification for admin session tokens.
// Token format: `${sessionId}.${expiresAtMs}.${base64url(hmacSha256(payload))}`

export const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;

const encoder = new TextEncoder();

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing ADMIN_SESSION_SECRET environment variable.");
  }
  return secret;
}

async function getHmacKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(buffer: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function signSessionToken(sessionId: string, expiresAtMs: number) {
  const payload = `${sessionId}.${expiresAtMs}`;
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${toBase64Url(signature)}`;
}

export type VerifiedSession = {
  sessionId: string;
  expiresAtMs: number;
};

export async function verifySessionToken(token: string): Promise<VerifiedSession | null> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [sessionId, expiresAtRaw, signature] = parts;
  const expiresAtMs = Number(expiresAtRaw);
  if (!sessionId || !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return null;
  }

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = fromBase64Url(signature);
  } catch {
    return null;
  }

  const key = await getHmacKey();
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(`${sessionId}.${expiresAtMs}`),
  );

  return valid ? { sessionId, expiresAtMs } : null;
}
