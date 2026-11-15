# WinsVoiceStudio

Android-native multilingual AI marketing Text-to-Speech application.

## Stack
- Android: Kotlin + Jetpack Compose
- Backend: Cloudflare Workers + TypeScript
- Database: Cloudflare D1
- Audio storage: private Cloudflare R2 bucket
- TTS: Google Cloud Text-to-Speech
- Authentication: Firebase Authentication
- Monetization: AdMob rewarded ads

## Package
`com.winsmediatama.winsvoicestudio`

## Security
Never commit Google service-account keys, Firebase credentials, signing keys, or secrets. Keep all TTS credentials on the backend.

See `docs/` for architecture, API, security and deployment plans.