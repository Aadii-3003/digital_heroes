# Digital Heroes — golf performance and charity draw platform

Next.js 14 (App Router) · Supabase (Postgres, Auth, Storage) · Stripe · Tailwind · deployable on Vercel.

## Deploy in ~10 minutes

### 1. New Supabase project
1. Create a **new** project at supabase.com.
2. SQL Editor → paste `supabase/schema.sql` → Run (creates tables, triggers, RLS, storage bucket, sample charities).
3. Authentication → Providers → Email → turn **off** "Confirm email" (so testers can sign in immediately).
4. Project settings → API → copy the Project URL, `anon` key and `service_role` key.

### 2. Push to GitHub, then deploy to a **new** Vercel account
1. `git init && git add . && git commit -m "Digital Heroes" && git push` to a new repo.
2. vercel.com → Add New Project → import the repo.
3. Add environment variables (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (your Vercel URL; you can set it after the first deploy and redeploy).
4. Deploy. Your live link is the `*.vercel.app` URL.

(CLI alternative: `npm i -g vercel && vercel --prod`.)

### 3. Create test credentials
Locally: copy `.env.example` to `.env.local`, fill in the Supabase values, then

    npm install
    npm run seed

This creates:

| Role | Email | Password |
|---|---|---|
| Admin | admin@digitalheroes.test | Admin@12345 |
| Subscriber (active, 5 scores) | user@digitalheroes.test | User@12345 |

No local setup? Sign up in the live site, then run in the SQL editor:
`update profiles set role='admin' where email='you@example.com';`

### 4. Optional: real Stripe payments
Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, and add a Stripe webhook to `https://YOUR-URL/api/stripe/webhook` for: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`.
Without Stripe keys the app runs a **demo checkout** that activates the plan instantly, so every flow can be tested.

## How to test the whole flow
1. Log in as the subscriber → dashboard: status, scores (add / edit / delete, rolling 5), charity %, participation, winnings.
2. Log in as admin → **Draws** → enter manual numbers matching the demo user's scores (e.g. three of `32, 28, 36, 24, 30` plus two others) → **Run simulation** → review → **Publish results**.
3. Subscriber dashboard now shows the win → upload a screenshot → admin **Winners** → Approve → Mark as paid.
4. Publish a draw with no 5-match winner: the jackpot shows as rolled over and is added to the next month's 5-match pool.

## Rules implemented (and assumptions where the PRD is ambiguous)
| Topic | Implementation |
|---|---|
| Plans | Monthly ₹499, yearly ₹4,999 (~17% off). Change in `lib/config.ts`. |
| Prize pool | 50% of each fee (yearly fees counted as 1/12 per month). Split 40% / 35% / 25% for 5 / 4 / 3 matches. |
| Charity | Chosen at signup; 10% minimum, 50% maximum (so charity + prize never exceeds 100%). One-off donations are separate. |
| Scores | 1–45, one per date, only the latest 5 kept (DB trigger + app checks). |
| Draw eligibility | Active subscription **and** 5 stored scores. |
| Match | Count of drawn numbers that appear among the member's 5 stored scores. |
| Algorithmic draw | Each number's weight is 1 + how many stored scores equal it, sampled without replacement. |
| Rollover | Only the 5-match jackpot rolls over. 4 and 3 tiers stay with the platform if nobody wins. |
| Publishing | Simulate as often as needed; publishing freezes entries and creates winners. |
| Subscription check | Evaluated on every request from status **and** period end (`lib/auth.ts`), so lapsed users lose access immediately. |
| Winner flow | awaiting proof → submitted → approved / rejected; payment pending → paid (only after approval). |

## Structure
- `supabase/schema.sql` — schema, triggers, RLS, seed charities
- `lib/draw.ts` — pure draw + prize maths · `lib/drawService.ts` — simulate / publish
- `lib/actions/*` — server actions (auth, member, subscription, admin)
- `app/` — public pages, `/dashboard`, `/admin/*`, `/api/stripe/webhook`

## Known limitations
- Stripe code is written to the Stripe docs but was not exercised against a live Stripe account; use demo mode to test flows.
- Email notifications (winner alerts) are not included; winners see results on their dashboard.
- Draw gathering pages through all subscribers in memory. For very large user bases, move it into a Postgres function.
