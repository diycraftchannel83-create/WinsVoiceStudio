# Deployment checklist

## 1. Google Cloud Text-to-Speech

1. Create a dedicated Google Cloud project.
2. Enable the Cloud Text-to-Speech API.
3. Enable billing and configure budget alerts and quota limits.
4. Create a dedicated service account with the minimum permissions required
   to call Text-to-Speech.
5. Keep the service-account private key outside GitHub. Never paste it into
   source files or commit it to this repository.

## 2. Firebase Authentication

1. Create or select a Firebase project.
2. In **Authentication → Sign-in method**, enable **Anonymous** sign-in.
   The Android starter client signs in anonymously and sends the Firebase ID
   token to the Worker.
3. Register the Android application with package
   `com.winsmediatama.winsvoicestudio`.
4. Record the Firebase project ID, Android app ID, and Web API key. These are
   used as local Android Gradle properties; do not add local config files to Git.

## 3. Cloudflare Worker, D1, and R2

1. Install Node.js LTS and Wrangler.
2. Run `cd backend && npm install`.
3. Authenticate: `npx wrangler login`.
4. Create the D1 database: `npx wrangler d1 create winsvoice-db`.
5. Create the private R2 bucket: `npx wrangler r2 bucket create winsvoice-audio`.
6. Copy the D1 database ID into `backend/wrangler.toml`.
7. Apply the schema: `npx wrangler d1 migrations apply DB --remote`.
8. Add Worker secrets from the `backend/` directory:

   ```bash
   npx wrangler secret put FIREBASE_PROJECT_ID
   npx wrangler secret put GOOGLE_CLOUD_PROJECT_ID
   npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
   npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
   ```

   For the private key, paste the complete PEM key when Wrangler prompts. Do not
   store it in `wrangler.toml`, GitHub source, or Android.
9. Deploy: `npm run deploy`.
10. Check `https://YOUR-WORKER.workers.dev/v1/health`. This endpoint is public
    and should return `ok: true`.

## 4. Android build configuration

Open the `android/` folder in Android Studio. The current client initializes
Firebase programmatically; a committed `google-services.json` is not required.

Set these Gradle project properties in the local, untracked
`~/.gradle/gradle.properties` file or pass them as `-P` arguments:

- `WINS_API_BASE_URL=https://YOUR-WORKER.workers.dev/`
- `FIREBASE_API_KEY=...`
- `FIREBASE_APP_ID=...`
- `FIREBASE_PROJECT_ID=...`

Build:

```bash
cd android
./gradlew assembleDebug \
  -PWINS_API_BASE_URL=https://YOUR-WORKER.workers.dev/ \
  -PFIREBASE_API_KEY=your_firebase_web_api_key \
  -PFIREBASE_APP_ID=your_firebase_android_app_id \
  -PFIREBASE_PROJECT_ID=your_firebase_project_id
```

The APK is generated at
`android/app/build/outputs/apk/debug/app-debug.apk`.

## 5. Pre-release verification

- Verify the Firebase project ID used by Android matches
  `FIREBASE_PROJECT_ID` configured in the Worker.
- Test the health endpoint, anonymous sign-in, credit balance, TTS generation,
  private audio streaming, and credit debit/refund behavior.
- Confirm the configured Google voice names are available for each selected
  language. The UI's starter voice choices may need adjustment based on the
  actual Google voice catalog enabled in the project.
- Configure privacy policy, account/data deletion, rewarded-ad server-side
  verification, production signing, and Play Store compliance before release.
- Set a strict Cloud Text-to-Speech budget and monitor the monthly character
  cap. The starter 100-credit allowance is not an advertising reward.
