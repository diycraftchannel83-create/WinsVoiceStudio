# Android setup

The Android client is a Kotlin + Jetpack Compose app. It uses Firebase anonymous
authentication to obtain an ID token, then calls the Cloudflare Worker API.
Generated MP3 audio is streamed from the private R2 bucket through an authenticated
endpoint.

## Required configuration

1. Create or select the Firebase project used by the Worker.
2. In Firebase Console, open **Authentication → Sign-in method** and enable
   **Anonymous** sign-in. The starter app creates an anonymous account on first use.
3. Register an Android app with package name
   `com.winsmediatama.winsvoicestudio`.
4. Copy the Firebase Web API key, Android app ID, and Firebase project ID.
5. Deploy the Worker and note its HTTPS URL.

Do not commit credentials or local configuration. Supply the values as Gradle
project properties when building:

```bash
cd android
./gradlew assembleDebug \
  -PWINS_API_BASE_URL=https://YOUR-WORKER.workers.dev/ \
  -PFIREBASE_API_KEY=your_firebase_web_api_key \
  -PFIREBASE_APP_ID=your_firebase_android_app_id \
  -PFIREBASE_PROJECT_ID=your_firebase_project_id
```

For local Android Studio builds, place the same properties in the user's
untracked `~/.gradle/gradle.properties` file. Do not add them to the repository.

## Build artifact

The debug APK is generated at:

`android/app/build/outputs/apk/debug/app-debug.apk`

## Current app flow

- Load the signed-in user's credit balance from `GET /v1/credits`.
- Submit text to `POST /v1/tts/generate` with an idempotency key.
- Play the returned MP3 using the authenticated R2 streaming route.
- The first 100 credits are provisioned by the Worker when the Firebase user
  first accesses the API. This is a starter allowance, not an advertising reward.

## Before release

- Configure Firebase anonymous sign-in and add the Android app to the correct
  Firebase project.
- Set the Cloudflare Worker secrets and D1/R2 bindings described in
  [deployment](../docs/DEPLOYMENT.md).
- Replace the placeholder Worker URL with the deployed HTTPS endpoint.
- Test Indonesian, English, Arabic, and Malay voices against the enabled Google
  Cloud Text-to-Speech voice catalog.
- Add a privacy policy, account/data deletion flow, rewarded-ad server-side
  verification, and production signing configuration before Play Store release.
