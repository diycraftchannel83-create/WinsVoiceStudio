type FirebaseClaims = {
  sub: string;
  user_id?: string;
  email?: string;
  aud: string;
  iss: string;
  exp: number;
  iat: number;
};

type FirebaseJwk = JsonWebKey & { kid?: string };
let cachedJwks: { keys: FirebaseJwk[]; expiresAt: number } | null = null;

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeJsonPart<T>(part: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(part))) as T;
}

async function getJwks(): Promise<FirebaseJwk[]> {
  if (cachedJwks && cachedJwks.expiresAt > Date.now()) return cachedJwks.keys;

  const response = await fetch(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  );
  if (!response.ok) throw new Error("FIREBASE_KEYS_UNAVAILABLE");

  const data = await response.json() as { keys?: FirebaseJwk[] };
  if (!data.keys?.length) throw new Error("FIREBASE_KEYS_EMPTY");

  cachedJwks = { keys: data.keys, expiresAt: Date.now() + 60 * 60 * 1000 };
  return data.keys;
}

export async function verifyFirebaseIdToken(
  authorization: string | null,
  projectId: string
): Promise<FirebaseClaims> {
  if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");

  const token = authorization.slice(7).trim();
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("INVALID_TOKEN");

  const header = decodeJsonPart<{ alg?: string; kid?: string }>(parts[0]);
  const claims = decodeJsonPart<FirebaseClaims>(parts[1]);

  if (header.alg !== "RS256" || !header.kid) throw new Error("INVALID_TOKEN_HEADER");
  if (claims.aud !== projectId) throw new Error("INVALID_TOKEN_AUDIENCE");
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("INVALID_TOKEN_ISSUER");
  }
  if (!claims.sub || claims.sub.length > 128) throw new Error("INVALID_TOKEN_SUBJECT");
  const now = Math.floor(Date.now() / 1000);
  if (!claims.exp || claims.exp <= now || claims.iat > now + 60) {
    throw new Error("TOKEN_EXPIRED_OR_INVALID");
  }

  const jwk = (await getJwks()).find((key) => key.kid === header.kid);
  if (!jwk) {
    cachedJwks = null;
    throw new Error("FIREBASE_SIGNING_KEY_NOT_FOUND");
  }

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signedContent = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    decodeBase64Url(parts[2]),
    signedContent
  );
  if (!valid) throw new Error("INVALID_TOKEN_SIGNATURE");

  return claims;
}
