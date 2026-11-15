import { verifyFirebaseIdToken } from "./lib/firebase-auth";
import { listGoogleVoices, synthesizeMp3 } from "./lib/google-tts";

export interface Env {
  DB: D1Database;
  AUDIO_BUCKET: R2Bucket;
  APP_ENV: string;
  MAX_TEXT_BYTES: string;
  MONTHLY_CHARACTER_CAP: string;
  FIREBASE_PROJECT_ID?: string;
  GOOGLE_CLOUD_PROJECT_ID?: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

async function authenticate(request: Request, env: Env) {
  if (!env.FIREBASE_PROJECT_ID) throw new Error("AUTH_NOT_CONFIGURED");
  return verifyFirebaseIdToken(request.headers.get("authorization"), env.FIREBASE_PROJECT_ID);
}

async function ensureUser(env: Env, uid: string, email?: string) {
  await env.DB.prepare(
    "INSERT OR IGNORE INTO users (id, firebase_uid, email) VALUES (?, ?, ?)"
  ).bind(uid, uid, email ?? null).run();

  await env.DB.prepare(
    "INSERT OR IGNORE INTO user_credits (user_id, balance) VALUES (?, 100)"
  ).bind(uid).run();
}

async function getBalance(env: Env, uid: string): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT balance FROM user_credits WHERE user_id = ?"
  ).bind(uid).first<{ balance: number }>();
  return row?.balance ?? 0;
}

async function generateAudio(request: Request, env: Env): Promise<Response> {
  const claims = await authenticate(request, env);
  await ensureUser(env, claims.sub, claims.email);

  const body = await request.json() as {
    text?: string;
    languageCode?: string;
    voiceName?: string;
    speakingRate?: number;
    pitch?: number;
    preset?: string;
    title?: string;
  };

  const text = body.text?.trim();
  if (!text) return json({ error: "TEXT_REQUIRED" }, 400);

  const byteLength = new TextEncoder().encode(text).length;
  const maxBytes = Number(env.MAX_TEXT_BYTES || 4500);
  if (byteLength > maxBytes) {
    return json({ error: "TEXT_TOO_LONG", maxBytes, actualBytes: byteLength }, 413);
  }

  const languageCode = body.languageCode || "id-ID";
  const voiceName = body.voiceName;
  if (!voiceName || voiceName.length > 100 || !/^[a-zA-Z0-9-]+$/.test(languageCode)) {
    return json({ error: "INVALID_VOICE_OR_LANGUAGE" }, 400);
  }

  const speakingRate = body.speakingRate ?? 1.0;
  const pitch = body.pitch ?? 0.0;
  if (!Number.isFinite(speakingRate) || speakingRate < 0.25 || speakingRate > 4.0) {
    return json({ error: "INVALID_SPEAKING_RATE" }, 400);
  }
  if (!Number.isFinite(pitch) || pitch < -20 || pitch > 20) {
    return json({ error: "INVALID_PITCH" }, 400);
  }

  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    return json({ error: "IDEMPOTENCY_KEY_REQUIRED" }, 400);
  }

  const existing = await env.DB.prepare(
    "SELECT status, response_json FROM idempotency_keys WHERE key = ? AND user_id = ?"
  ).bind(idempotencyKey, claims.sub).first<{ status: string; response_json: string | null }>();

  if (existing?.status === "complete" && existing.response_json) {
    return json(JSON.parse(existing.response_json));
  }
  if (existing) return json({ error: "REQUEST_ALREADY_PROCESSING" }, 409);

  const reserve = await env.DB.prepare(
    "INSERT OR IGNORE INTO idempotency_keys (key, user_id, status) VALUES (?, ?, 'processing')"
  ).bind(idempotencyKey, claims.sub).run();
  if ((reserve.meta.changes ?? 0) !== 1) {
    return json({ error: "REQUEST_ALREADY_PROCESSING" }, 409);
  }

  const characterCount = Array.from(text).length;
  const monthlyCap = Number(env.MONTHLY_CHARACTER_CAP || 3000000);
  const monthlyUsage = await env.DB.prepare(
    "SELECT COALESCE(SUM(character_count), 0) AS total FROM usage_logs WHERE status = 'success' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
  ).first<{ total: number }>();
  if ((monthlyUsage?.total ?? 0) + characterCount > monthlyCap) {
    return json({ error: "MONTHLY_FREE_QUOTA_REACHED", monthlyCap }, 429);
  }

  const credits = Math.max(1, Math.ceil(characterCount / 500) * 10);
  const deduction = await env.DB.prepare(
    "UPDATE user_credits SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND balance >= ?"
  ).bind(credits, claims.sub, credits).run();

  if ((deduction.meta.changes ?? 0) !== 1) {
    await env.DB.prepare("DELETE FROM idempotency_keys WHERE key = ? AND user_id = ?")
      .bind(idempotencyKey, claims.sub).run();
    return json({ error: "INSUFFICIENT_CREDITS", balance: await getBalance(env, claims.sub) }, 402);
  }

  const audioId = crypto.randomUUID();
  const objectKey = `users/${claims.sub}/${audioId}.mp3`;
  let stored = false;

  try {
    const transactionId = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO credit_transactions (id, user_id, amount, type, reference_id) VALUES (?, ?, ?, 'tts_debit', ?)"
    ).bind(transactionId, claims.sub, -credits, idempotencyKey).run();

    const audio = await synthesizeMp3(env, {
      text,
      languageCode,
      voiceName,
      speakingRate,
      pitch
    });

    await env.AUDIO_BUCKET.put(objectKey, audio, {
      httpMetadata: { contentType: "audio/mpeg", cacheControl: "private, no-store" },
      customMetadata: { userId: claims.sub, audioId }
    });
    stored = true;

    const title = (body.title?.trim() || text.slice(0, 64)).slice(0, 120);
    await env.DB.prepare(
      "INSERT INTO audio_files (id, user_id, title, language_code, voice_name, r2_key, character_count) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(audioId, claims.sub, title, languageCode, voiceName, objectKey, characterCount).run();

    await env.DB.prepare(
      "INSERT INTO usage_logs (id, user_id, character_count, provider, status) VALUES (?, ?, ?, 'google-cloud-tts', 'success')"
    ).bind(crypto.randomUUID(), claims.sub, characterCount).run();

    const balance = await getBalance(env, claims.sub);
    const result = {
      audio_id: audioId,
      title,
      language_code: languageCode,
      voice_name: voiceName,
      character_count: characterCount,
      audio_bytes: audio.byteLength,
      credits_used: credits,
      credit_balance: balance,
      stream_path: `/v1/audio/${audioId}/stream`
    };

    await env.DB.prepare(
      "UPDATE idempotency_keys SET status = 'complete', response_json = ? WHERE key = ? AND user_id = ?"
    ).bind(JSON.stringify(result), idempotencyKey, claims.sub).run();

    return json(result, 201);
  } catch (error) {
    if (stored) await env.AUDIO_BUCKET.delete(objectKey);
    await env.DB.batch([
      env.DB.prepare(
        "DELETE FROM audio_files WHERE id = ? AND user_id = ?"
      ).bind(audioId, claims.sub),
      env.DB.prepare(
        "UPDATE user_credits SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
      ).bind(credits, claims.sub),
      env.DB.prepare(
        "INSERT INTO credit_transactions (id, user_id, amount, type, reference_id) VALUES (?, ?, ?, 'tts_refund', ?)"
      ).bind(crypto.randomUUID(), claims.sub, credits, idempotencyKey),
      env.DB.prepare(
        "DELETE FROM idempotency_keys WHERE key = ? AND user_id = ?"
      ).bind(idempotencyKey, claims.sub)
    ]);
    await env.DB.prepare(
      "INSERT INTO usage_logs (id, user_id, character_count, provider, status) VALUES (?, ?, ?, 'google-cloud-tts', 'failed')"
    ).bind(crypto.randomUUID(), claims.sub, characterCount).run();
    return json({ error: "TTS_GENERATION_FAILED", message: "Audio generation failed. Credits were refunded." }, 502);
  }
}

async function streamAudio(request: Request, env: Env, audioId: string): Promise<Response> {
  const claims = await authenticate(request, env);
  const row = await env.DB.prepare(
    "SELECT r2_key, title FROM audio_files WHERE id = ? AND user_id = ?"
  ).bind(audioId, claims.sub).first<{ r2_key: string; title: string | null }>();

  if (!row) return json({ error: "AUDIO_NOT_FOUND" }, 404);
  const object = await env.AUDIO_BUCKET.get(row.r2_key);
  if (!object) return json({ error: "AUDIO_OBJECT_NOT_FOUND" }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", "audio/mpeg");
  headers.set("cache-control", "private, no-store");
  headers.set("content-disposition", 'inline; filename="winsvoice.mp3"');
  return new Response(object.body, { headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/v1/health") {
      return json({ ok: true, service: "winsvoicestudio-api", environment: env.APP_ENV });
    }

    if (request.method === "GET" && url.pathname === "/v1/voices") {
      try {
        await authenticate(request, env);
        const languageCode = url.searchParams.get("languageCode") || undefined;
        return json(await listGoogleVoices(env, languageCode));
      } catch (error) {
        const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
        const status = message === "UNAUTHORIZED" || message.startsWith("INVALID_TOKEN") ||
          message.startsWith("TOKEN_") ? 401 : 503;
        return json({ error: message }, status);
      }
    }

    if (request.method === "POST" && url.pathname === "/v1/tts/generate") {
      try {
        return await generateAudio(request, env);
      } catch (error) {
        const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
        const status = message === "UNAUTHORIZED" || message.startsWith("INVALID_TOKEN") ||
          message.startsWith("TOKEN_") ? 401 : 503;
        return json({ error: message }, status);
      }
    }

    const streamMatch = url.pathname.match(/^\/v1\/audio\/([a-f0-9-]+)\/stream$/i);
    if (request.method === "GET" && streamMatch) {
      try {
        return await streamAudio(request, env, streamMatch[1]);
      } catch {
        return json({ error: "AUDIO_STREAM_FAILED" }, 502);
      }
    }

    return json({ error: "NOT_FOUND" }, 404);
  }
};
