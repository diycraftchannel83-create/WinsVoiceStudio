# Security checklist

- [ ] Verify Firebase ID token signature, issuer, audience and expiry.
- [ ] Keep Google service-account credentials in Worker secrets only.
- [ ] Use least-privilege IAM for the Google TTS service account.
- [ ] Keep R2 bucket private and authorize every audio request.
- [ ] Validate input size, language, voice, rate and pitch server-side.
- [ ] Enforce per-user rate limits and global monthly character cap.
- [ ] Reserve/settle/refund credits transactionally and idempotently.
- [ ] Verify AdMob SSV signatures before awarding reward credits.
- [ ] Do not log raw marketing text or credentials.
- [ ] Provide account deletion and audio retention controls.
- [ ] Configure Google Cloud budget alerts and emergency disable switch.
