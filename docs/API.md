# API v1

Protected endpoints require `Authorization: Bearer <Firebase ID token>`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/health` | Health check |
| GET | `/v1/voices?languageCode=id-ID` | Available voice catalog |
| POST | `/v1/tts/estimate` | Estimate credit usage |
| POST | `/v1/tts/generate` | Generate and store MP3 |
| GET | `/v1/audio` | List caller's audio |
| GET | `/v1/audio/:id` | Audio metadata |
| GET | `/v1/audio/:id/stream` | Authenticated MP3 stream |
| DELETE | `/v1/audio/:id` | Delete caller-owned audio |
| GET | `/v1/credits` | Credit balance |
| POST | `/v1/rewards/verify` | Internal AdMob SSV verification callback |

## Generate request
```json
{
  "text": "Dapatkan produk terbaik hari ini!",
  "languageCode": "id-ID",
  "voiceName": "id-ID-Standard-A",
  "speakingRate": 1.0,
  "pitch": 0.0,
  "preset": "energetic"
}
```

The server must calculate UTF-8 bytes and character count itself. Never accept
client-supplied user ID, cost, credit amount, or usage totals as authoritative.
Use an idempotency key for generation requests.
