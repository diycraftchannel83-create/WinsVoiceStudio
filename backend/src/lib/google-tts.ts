export interface GoogleTtsInput {
  text: string;
  languageCode: string;
  voiceName: string;
  speakingRate: number;
  pitch: number;
}

type GoogleTokenResponse = { access_token: string; expires_in: number };
let cachedToken: { value: string; expiresAt: number } | null = null;

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToBytes(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(body);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getGoogleAccessToken(env: {
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
}): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error("GOOGLE_TTS_NOT_CONFIGURED");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = base64Url(new TextEncoder().encode(JSON.stringify({
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  })));
  const unsigned = `${header}.${claims}`;

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(unsigned)
  ));
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  if (!response.ok) throw new Error("GOOGLE_OAUTH_FAILED");

  const token = await response.json() as GoogleTokenResponse;
  cachedToken = { value: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 };
  return token.access_token;
}

export async function synthesizeMp3(
  env: {
    GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
  },
  input: GoogleTtsInput
): Promise<Uint8Array> {
  const accessToken = await getGoogleAccessToken(env);
  const response = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      input: { text: input.text },
      voice: { languageCode: input.languageCode, name: input.voiceName },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: input.speakingRate,
        pitch: input.pitch
      }
    })
  });

  if (!response.ok) {
    // Do not return provider response bodies; they may contain internal details.
    throw new Error(`GOOGLE_TTS_REQUEST_FAILED_${response.status}`);
  }
  const result = await response.json() as { audioContent?: string };
  if (!result.audioContent) throw new Error("GOOGLE_TTS_EMPTY_AUDIO");

  const binary = atob(result.audioContent);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}


export async function listGoogleVoices(
  env: {
    GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
  },
  languageCode?: string
): Promise<unknown> {
  const accessToken = await getGoogleAccessToken(env);
  const endpoint = new URL("https://texttospeech.googleapis.com/v1/voices");
  if (languageCode) endpoint.searchParams.set("languageCode", languageCode);

  const response = await fetch(endpoint, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error(`GOOGLE_VOICE_LIST_FAILED_${response.status}`);
  return response.json();
}
