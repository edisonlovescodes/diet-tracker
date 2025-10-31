## Diet Tracker for Creators (Whop)

A simple, creator-branded nutrition tracker that runs inside a Whop experience. Members log meals and weigh-ins, build streaks, and see compliance at a glance so you can run lightweight challenges or accountability check-ins without extra tooling.

### Requirements
- Node 20+
- pnpm
- Whop creator account with an app configured
- MongoDB connection string

### Environment
Copy `.env.example` to `.env.local` (and `.env` for production). Required keys:

```
WHOP_API_KEY=...
WHOP_APP_ID=...
NEXT_PUBLIC_WHOP_APP_ID=...
NEXT_PUBLIC_WHOP_AGENT_USER_ID=...
DATABASE_URL=...
```

`WHOP_APP_ID` is used server-side; keep `NEXT_PUBLIC_WHOP_APP_ID` for client references or existing embeds.

### Development
Run the app through the Whop dev proxy so iframe headers are injected automatically:

```bash
pnpm install
pnpm exec whop-proxy --command "pnpm dev"
```

In the Whop dashboard, enable the dev proxy and point the experience to `http://localhost:3000`. All session-required routes (e.g., `/experiences/[experienceId]`) will now authenticate properly.

### Running inside Whop
1. Deploy the built app (Vercel works well).
2. Add the deployment URL to your Whop experience.
3. Set the production environment variables (`WHOP_API_KEY`, `WHOP_APP_ID`, `DATABASE_URL`, etc.) in your host.
4. Members opening the experience will see their personalized dashboard once Whop forwards the `X-Whop-User-Token`.

### Database & Prisma

```bash
pnpm prisma generate
pnpm prisma db push
```

Seeds/live data live in MongoDB. Running the dashboard without a database connection falls back to the guest landing view.

### Useful Commands
- `pnpm dev` – Next.js dev server (without proxy)
- `pnpm build` / `pnpm start` – Production build & serve
- `pnpm lint` – ESLint
- `pnpm db:push` – Sync schema
- `pnpm db:seed` – Seed demo data

### Support
Need help wiring to other Whop flows or automations? Ping the Whop developer team via your creator dashboard.
