# Production Rollout Plan (Post-Integration)

This plan starts **after** integration is complete and the app is working well in development.

## Phase 1 — Free Phase (Launch + Validation)

Use this to go live quickly for a few users and validate real usage.

### Provider Combination
- **Frontend:** Vercel (Free)
- **Backend API:** Render (Free Web Service)
- **Database:** Neon (Free Postgres)
- **API Docs Hosting:** Vercel static docs (`docs/` folder)
- **Email:** `EMAIL_PROVIDER=TEST` (no real email sending yet)
- **Redis/Queue:** Disabled (`REDIS_ENABLED=false`)
- **File Export Storage:** Keep basic/local flow or disable large queued exports temporarily

### Month-1 Budget Range
- **Estimated total:** **$0 – $10**

### Notes
- Best for demos and early real users.
- Backend may sleep on free tier (cold starts).
- Do not rely on this phase for strict uptime/SLA.

---

## Phase 2 — Stable Paid Phase (Reliable MVP Production)

Move to this once you want dependable uptime and smoother UX.

### Provider Combination
- **Frontend:** Vercel (Free or Pro if needed)
- **Backend API:** Render (Paid Starter instance)
- **Database:** Neon (Paid Postgres plan)
- **Redis (for queue/exports):** Upstash Redis (Paid entry plan)
- **Email:** Resend (Paid entry plan) or SendGrid paid starter
- **File Export Storage:** AWS S3 (pay-as-you-go)
- **Monitoring/Error Tracking:** Sentry (Free first, paid later if needed)

### Month-1 Budget Range
- **Estimated total:** **$35 – $90**

### Notes
- Suitable for small team usage with better reliability.
- Supports real email flows, queued exports, and persistent file delivery.
- Scale up only when usage increases.

---

## Recommended Path
1. Start with **Phase 1** immediately after integration testing is complete.
2. Run for 1–2 weeks with real users.
3. If cold starts/limits affect usage, move to **Phase 2**.

## Cost Assumption
All prices are approximate and can change by provider, region, and usage patterns. Use this as planning guidance for month-1 budgeting.
