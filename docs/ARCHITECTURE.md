# WinsVoiceStudio Architecture

## Stack
- Android: Kotlin, Jetpack Compose, Media3
- API: Cloudflare Workers + TypeScript
- Database: Cloudflare D1
- Object storage: private Cloudflare R2 bucket
- Speech synthesis: Google Cloud Text-to-Speech Standard voices
- Identity: Firebase Authentication; backend verifies Firebase ID tokens
- Monetization: AdMob rewarded ads with server-side verification

## Request flow
1. Android signs in with Firebase and obtains a short-lived Firebase ID token.
2. Android calls the Worker over HTTPS with the token.
3. Worker verifies token signature, issuer, audience and expiry.
4. Worker validates text bytes, language, voice, rate and pitch.
5. Worker checks global and per-user quotas and reserves credits idempotently.
6. Worker obtains Google OAuth access token using a dedicated service account.
7. Worker calls Google Cloud Text-to-Speech and receives MP3 bytes.
8. Worker stores the MP3 in a private R2 bucket and records metadata in D1.
9. Android plays or downloads the audio through an authenticated endpoint.

## Important constraints
- Never ship Google credentials in the Android app or repository.
- Keep R2 private; authorize every stream/download against the owning user.
- Credit reservation and settlement must be idempotent and concurrency-safe.
- Reward credits only after validating AdMob SSV callbacks.
- Apply per-user daily quotas and a global monthly character cap.
- Chunk long text on sentence boundaries; keep each Google request within the
  provider's documented byte limit.
- Do not perform expensive audio transcoding inside a Worker.
- Configure budget alerts and a server-side kill switch before public launch.
