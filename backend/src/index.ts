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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/v1/health") {
      return json({
        ok: true,
        service: "winsvoicestudio-api",
        environment: env.APP_ENV
      });
    }

    // Fail closed: protected endpoints remain unavailable until Firebase
    // ID-token verification and authorization middleware are implemented.
    if (url.pathname.startsWith("/v1/")) {
      return json({
        error: "AUTH_NOT_CONFIGURED",
        message: "Protected API is disabled until Firebase verification is configured."
      }, 503);
    }

    return json({ error: "NOT_FOUND" }, 404);
  }
};
