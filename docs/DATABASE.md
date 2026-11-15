# D1 Database

Initial migration: `backend/migrations/0001_initial.sql`.

Tables:
- `users`: Firebase identity mapping.
- `user_credits`: server-owned credit balance.
- `credit_transactions`: append-only credit ledger.
- `audio_files`: private R2 object metadata and ownership.
- `usage_logs`: provider usage and generation status.
- `ad_rewards`: unique verified rewarded-ad transactions.
- `idempotency_keys`: request replay protection.

All credit writes must be performed server-side. Generation should reserve
credits once, settle after successful synthesis/storage, and refund once on
failure. Use D1 batch/transaction patterns and unique idempotency keys to
prevent duplicate deductions and reward grants.
