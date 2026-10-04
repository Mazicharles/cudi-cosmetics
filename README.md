# Cudi Cosmetics

**Beauty, made simple.** A mobile-first Nigerian cosmetics shop built with Next.js App Router, TypeScript, Tailwind CSS, Supabase Postgres and Google Auth, Paystack hosted checkout, Resend, and Zod. All amounts are integer kobo and all customer-facing dates use Africa/Lagos.

## Features

- Cream/blush storefront, square product imagery, serif headings, search, category filters, sorting, stock-aware product details.
- Persistent guest bag, authenticated database bag, guest merge after Google sign-in.
- Protected checkout, account, order history, order details, and confirmation pages.
- Server-priced checkout, atomic stock reservations, signed webhooks, provider verification, idempotent payment finalization, payment retries and expiry release.
- HTML and plain-text confirmation emails with database duplicate protection and Resend idempotency keys.
- RLS on every table, server-only secrets, strict TypeScript, ESLint, Prettier, and Vitest.

## Local setup

Use Node.js 22 LTS and npm. From this directory:

```sh
npm install
cp .env.example .env.local
# On PowerShell: Copy-Item .env.example .env.local
npm run dev
```

Fill in `.env.local` before using authentication, products, checkout, or email. Open http://localhost:3000. Without Supabase configuration the shell displays an empty collection; demo products are seeded in the database, not substituted for real stock. Never commit `.env.local`.

```sh
npm run lint
npm test
npm run build
npm start
npm run format
```

`next/font` downloads the Google fonts when building; allow network access on the build machine. `next/image` optimizes the placeholder product photos. Replace them with accurate licensed product photographs before launch; add your image host to `next.config.ts`.

## Supabase

1. Create a project at https://supabase.com/dashboard and save the database password securely.
2. In the SQL Editor run `supabase/migrations/001_store.sql`, then `supabase/migrations/002_webhook_inbox.sql`, then `supabase/seed.sql`. Run each migration once. The seed can be run again safely without duplicating products.
3. Copy the project URL and public anon key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Copy the service role key into `SUPABASE_SERVICE_ROLE_KEY`. The service role bypasses RLS and must only be available on the server.
4. Alternatively, with the Supabase CLI installed: `supabase login`, `supabase link --project-ref <ref>`, `supabase db push`, then execute the seed in SQL Editor. For a local Supabase stack, `supabase start` and `supabase db reset` use `supabase/config.toml` and its configured seed.
5. The auth trigger creates a profile for each new user. Existing auth users can be backfilled by an administrator with their real verified email and metadata before use.

The migration adds constraints, RLS, indexes (unique constraints already provide slug/reference indexes), service-role-only stock/order RPCs, and an atomic email claim. Public users can read active products and categories. Authenticated users can only read their own order/payment/email records and write their own profile/cart. Order lines snapshot the purchased product names and prices.

## Google Cloud and Supabase Auth

1. Create a Google Cloud project at https://console.cloud.google.com/.
2. Configure Google Auth Platform / OAuth consent screen. Set the app name to **Cudi Cosmetics**, support email, audience, and developer contact. During testing add the Google accounts that will sign in as test users.
3. Create an OAuth 2.0 **Web application** Client ID.
4. Add the authorized redirect URI exactly as `https://<project-ref>.supabase.co/auth/v1/callback`. This is the Supabase callback, not the app callback.
5. In Supabase **Authentication → Providers → Google**, enable Google and paste the client ID and client secret.
6. In Supabase **Authentication → URL Configuration**, set the Site URL to `http://localhost:3000` for development (your HTTPS domain in production). Add `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback` as allowed redirect URLs. Also allow query strings for the application's `next` return path using the appropriate Supabase redirect pattern, e.g. `http://localhost:3000/auth/callback**` for development, and your exact production origin with `/auth/callback**`.
7. Set `NEXT_PUBLIC_SITE_URL` to the same app origin, without a trailing slash. OAuth uses PKCE, cookie-based SSR sessions, and middleware refresh. Protected pages retain their return path; redirects reject external destinations.

Reference: [Supabase server-side clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs).

## Paystack

1. Create an account at https://dashboard.paystack.com/ and use **test mode**.
2. From **Settings → API Keys & Webhooks**, copy the TEST secret key into `PAYSTACK_SECRET_KEY`. No public key is needed because the server initializes hosted checkout.
3. Set the test webhook URL to `https://<your-domain>/api/webhooks/paystack`.
4. Locally run a tunnel, e.g. `ngrok http 3000`. Set `NEXT_PUBLIC_SITE_URL` to the HTTPS tunnel origin, set that origin's OAuth callback in Supabase's redirect allowlist, set the Paystack webhook to that origin, and restart Next.js. Google Cloud still redirects to Supabase's callback URL.
5. Add products, sign in, submit a shipping address, and pay on Paystack's hosted page. The site never receives card details.

Official [Paystack test payments](https://paystack.com/docs/payments/test-payments/) examples (use any future expiry):

| Scenario                  | Card                    | CVV | PIN / OTP     |
| ------------------------- | ----------------------- | --- | ------------- |
| Successful, no validation | 4084 0840 8408 4081     | 408 | —             |
| Successful, PIN + OTP     | 5060 6666 6666 6666 666 | 123 | 1234 / 123456 |
| Declined                  | 4084 0800 0000 5408     | 001 | —             |

For live launch: complete Paystack business verification and approval, replace the test key with the live secret, configure the live HTTPS webhook, deploy with the correct site URL, verify the live payment channels enabled for your account, verify your Resend domain, and make a small real transaction plus a refund/reconciliation check. Never use test cards in live mode. See [accepting payments](https://paystack.com/docs/payments/accept-payments/) and [webhook signatures](https://paystack.com/docs/payments/webhooks/).

## Resend

1. Create a Resend account and API key at https://resend.com/. Set `RESEND_API_KEY`.
2. For development use `EMAIL_FROM="Cudi Cosmetics <onboarding@resend.dev>"`. This test sender only delivers to the Resend account owner's email, so use that same email to sign in when testing receipt.
3. For real customers add a custom domain in Resend, publish its SPF and DKIM DNS records exactly as shown in the dashboard, and wait for verification. Update `EMAIL_FROM` to e.g. `Cudi Cosmetics <orders@your-domain.com>`.
4. Payment confirmation commits before email sending. Email errors are logged in `email_logs` and never undo a paid order. The partial unique index prevents concurrent callbacks/webhooks from claiming duplicate sends; [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys) provide an additional 24-hour provider safety window.

## Vercel deployment

1. Push the repository to your Git host, import it into Vercel, and choose the Next.js preset.
2. Set all eight environment variables from `.env.example` for the appropriate environments. Use separate test/live projects or keys for previews and production. Set `NEXT_PUBLIC_SITE_URL` to the deployed canonical HTTPS origin.
3. Add the production Supabase OAuth redirect URL, configure the Paystack webhook, and verify the sender domain.
4. Deploy. `vercel.json` calls `/api/cron/release-orders` every 15 minutes. Vercel sends `Authorization: Bearer <CRON_SECRET>`; use a strong random secret. This schedule requires a Vercel plan supporting that frequency. On a plan allowing daily cron only, change the schedule or arrange an external scheduler with the same bearer header. Product page visits also release expired orders.
5. Verify cron delivery and server logs in Vercel. Do not add service keys to any `NEXT_PUBLIC_*` variable.

Manual release:

```sh
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain/api/cron/release-orders
```

## Structure and decisions

```text
app/                  App Router pages, OAuth callback, API and webhook routes
components/           Interactive cart, checkout, auth controls, shared views
lib/config.ts         Brand name, tagline, about text, shipping policy, states
lib/supabase/         Browser, cookie SSR, and server-only service-role clients
lib/payments/         PaymentService interface, Paystack, shared finalization
lib/email.ts          Resend helper and atomic confirmation send claim
lib/email-template.ts Escaped HTML/table and plain-text confirmation template
lib/validation.ts     Zod checkout schema, phone and redirect validation
supabase/migrations/  Schema, RLS, triggers, transactional stock/payment RPCs
supabase/seed.sql     16 fictional products, four in each category
tests/                Vitest money, validation, signature, finalization, email
```

`create_order` locks products in stable order, rechecks price/stock, creates immutable line snapshots, and decrements stock in one transaction. Reservation at checkout prevents two customers from purchasing the last unit. Failed initialization/terminal verification cancels once and restores stock. `release_expired_orders` releases pending reservations older than 30 minutes; locks make release/finalize races safe. Payment verification checks reference, amount and NGN, with database revalidation. Already-paid orders are never paid or decremented twice. Late successful charges after cancellation/expiry are flagged for manual refund; they cannot fulfill released stock. A pending Paystack verification is not treated as failure.

Checkout accepts only product IDs, positive bounded quantities, and shipping fields. It caps decoded input at 20 KB and checks same-origin requests. It also limits recent orders per user (a basic database check, not a distributed atomic rate limiter). Duplicate product IDs are rejected transactionally. Shipping policy values are passed from the single server config to the privileged RPC, so UI and database calculation agree. Nigerians can enter the requested 080/081/070/090/091 or +234 equivalents without separators; postal code is optional.

Retries create a new Paystack reference, require ownership and an unexpired pending order, and throttle rapid re-initialization. Old Paystack links can remain payable: if two attempts are paid, only the first fulfills the order; review duplicate charges in Paystack and refund manually. Never automatically cancel a processing transaction merely because a browser closes. The webhook verifies raw-body HMAC SHA512, stores a durable event in a service-role-only inbox, and returns 200 quickly. Next.js `after()` calls shared provider verification after the response. Cron retries pending inbox events before releasing expired stock. If the inbox cannot be written, return 503 so Paystack can redeliver. Invalid signatures return 401.

Guest cart quantities add to the saved cart on login (capped at 99), and the guest copy is removed only after a successful sync. Product stock is authoritative at checkout. Paid orders clear the database cart transactionally and the confirmation page clears the current browser cart. Delivery is Nigeria-only with a flat rate; there are no tax, variants, admin, or courier calculations in this first version.

## Known limitations and next steps

- Accounts, provider keys, DNS, Google consent publishing, and deployment must be configured manually. Application tests mock Paystack; embedded Postgres tests run the SQL, constraints, stock/payment transactions, and RLS policies. They do not replace a real provider integration test or a multi-session concurrency test against your Supabase project.
- The production dependency audit is checked with `npm audit --omit=dev`. Next.js's nested PostCSS is overridden to the patched direct version. Remaining audit findings concern the development-only glob/braces dependency chain in Tailwind 3 and Next ESLint. It processes repository-owned patterns; do not feed untrusted patterns into build tooling. Follow upstream fixes or migrate those tools when a compatible fix is available. `.npmrc` uses npm's legacy peer resolver to avoid an npm resolver crash during the Vitest upgrade.
- Add an admin dashboard for catalog, fulfillment, support contacts, shipment tracking, refunds, flagged/duplicate payment reconciliation, product reviews, discounts, and variants/shades.
- Add a durable email outbox/worker and alerting. A process crash after claiming `sending` can leave that log stuck; an administrator must reconcile Resend delivery before recovering the claim. Failed email logs can be retried by a later verified callback/webhook; avoid retries beyond the provider's 24-hour idempotency window without delivery reconciliation.
- Add per-user serialized cart mutations for multiple simultaneous tabs/devices, atomic request deduplication and distributed rate limiting before high-volume campaigns. Clearing the whole saved cart after payment follows the requested behavior, including items added during payment in another tab.
- Monitor cron availability, stock reservations, email failures, provider reconciliation, and suspicious payments. Configure privacy/returns/shipping policies, real product safety documentation, and support contact before public launch.
- The seeded catalog is fictional, with illustrative photos and example ingredients/claims. Validate product claims, full INCI labeling, applicable registrations, and inventory before selling actual cosmetics.

## Manual acceptance checklist

1. Sign in with Google; verify the profile row, name/avatar, protected-page return path, and sign-out.
2. Browse all 16 products, search, filter categories, sort prices, and open product details on mobile.
3. Add/update/remove bag items; refresh as guest, then sign in and confirm guest/saved cart merge.
4. Checkout with a Nigerian address. Reject invalid phone/state/quantity. Check the free-shipping boundary at ₦50,000 and confirm server prices override any tampered client request.
5. Pay with a Paystack successful test card. Land on confirmation, check item totals/address, verify paid order and cleared cart, and receive exactly one email.
6. View order history/detail. Sign in as another user and ensure the first user's order URL is inaccessible.
7. Send/replay the signed webhook and revisit the callback; verify no duplicate payment fulfillment or email. Invalid signature must return 401.
8. Close checkout before paying. After 30 minutes trigger cron or visit products and confirm cancellation/stock restoration occurs once. Test a decline and retry an unexpired pending order.
9. Simulate concurrent last-unit checkout, provider initialization failure, mismatched amount/currency, and email failure. Confirm stock/payment safety and email failure isolation. Review late/duplicate charges manually.
