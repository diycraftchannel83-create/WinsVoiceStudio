# Deployment checklist

## Google Cloud
1. Create a dedicated Google Cloud project.
2. Enable Cloud Text-to-Speech API.
3. Enable billing and configure budget alerts.
4. Create a dedicated service account with only the permissions needed to call
   Text-to-Speech.
5. Do not download or commit the service-account key into this repository.
6. Configure the service account credentials as Cloudflare Worker secrets.

## Cloudflare
1. Install Node.js LTS and Wrangler.
2. Run `cd backend && npm install`.
3. Authenticate with `npx wrangler login`.
4. Create D1 database: `npx wrangler d1 create winsvoice-db`.
5. Create private R2 bucket: `npx wrangler r2 bucket create winsvoice-audio`.
6. Replace the D1 database ID in `backend/wrangler.toml`.
7. Apply migrations: `npx wrangler d1 migrations apply DB --remote`.
8. Configure secrets with `npx wrangler secret put SECRET_NAME`.
9. Deploy with `npm run deploy`.

Required secrets will include Firebase project configuration and Google service
account credentials. Protected API routes must remain disabled until Firebase
ID-token verification is implemented and tested.

## Android
1. Open the `android/` folder in Android Studio.
2. Add Firebase Android app using package
   `com.winsmediatama.winsvoicestudio`.
3. Place `google-services.json` locally under `android/app/`; never commit it.
4. Configure the API base URL using build configuration.
5. Build and test on a physical Android device.
