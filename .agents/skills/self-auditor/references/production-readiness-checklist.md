# Production Readiness Checklist

Use this checklist as an audit lens. Apply the relevant sections for the code under review, and treat missing evidence as risk.

## Security

- Are API routes rate-limited?
- Are secrets kept server-side?
- Are webhooks signature-verified?
- Is CORS restricted to known origins?
- Is user input validated and sanitized?
- Are SQL queries parameterized?
- Are auth tokens stored safely?
- Are cookies `httpOnly`, `secure`, and `sameSite` where appropriate?

## Authorization

- Are admin routes protected by role checks?
- Can one user access another user's resources by changing IDs?
- Are server-side ownership checks present?

## Cost protection

- Can public endpoints spam expensive AI/model calls?
- Are retries bounded?
- Are abuse controls present on file uploads, AI routes, OCR, image generation, and similar expensive paths?

## Backend scale

- Are expensive queries indexed?
- Is pagination implemented?
- Is connection pooling configured?
- Are there N+1 patterns?

## Reliability

- Is there structured logging?
- Is there a health endpoint?
- Are errors handled consistently?
- Are env vars validated at startup?

## Data safety

- Is there a backup/restore plan?
- Are migrations reversible?
- Is destructive behavior guarded?

## Code quality

- Is TypeScript used where the codebase supports it?
- Are runtime schemas used for untrusted input?
- Are types too loose?
- Are null/undefined paths handled?
