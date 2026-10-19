# Paddle live cutover runbook

Eciperay's billing runs on Paddle's **sandbox** catalog today. This runbook
flips **production only** to the live catalog. Dev, tests, and Fly preview apps
stay on sandbox permanently — nothing about them changes.

## How the switch works

One variable selects the catalog in each layer; until it is flipped, behavior is
byte-identical to today:

| Layer          | Switch                                                | Sandbox (default)                           | Live (after cutover)              |
| -------------- | ----------------------------------------------------- | ------------------------------------------- | --------------------------------- |
| Server         | Fly secret `PADDLE_ENVIRONMENT`                       | unset / `sandbox`                           | `production`                      |
| Server API     | Fly secret `PADDLE_API_BASE`                          | derived: `https://sandbox-api.paddle.com`   | derived: `https://api.paddle.com` |
| Server secrets | Fly secrets `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET` | sandbox values                              | live values                       |
| Web build      | GitHub variable `PADDLE_ENVIRONMENT`                  | unset → build arg `sandbox`                 | `production`                      |
| Web token      | GitHub secret `VITE_PADDLE_CLIENT_TOKEN`              | unset → Dockerfile's baked-in sandbox token | live client-side token            |
| Price → plan   | `plan_prices` table                                   | migration 017 (sandbox IDs)                 | migration 018 (live IDs)          |

Safety rails in code:

- The server refuses to boot with `PADDLE_ENVIRONMENT=production` when
  `PADDLE_API_KEY` or `PADDLE_WEBHOOK_SECRET` is missing, or when
  `PADDLE_API_BASE` still points at the sandbox host
  (`packages/server/src/lib/paddleConfig.ts`).
- The production deploy workflow refuses to build with
  `PADDLE_ENVIRONMENT=production` when the `VITE_PADDLE_CLIENT_TOKEN` secret is
  missing (`.github/workflows/fly-deploy.yml`).
- A webhook event carrying a price ID with no `plan_prices` row throws and
  Paddle retries — live purchases can never be silently mapped to the wrong plan
  or dropped.

## Go-live checklist (Stephen only)

Everything below needs the Paddle dashboard, Fly secrets, or GitHub settings —
it cannot be done from code.

1. **Live catalog.** In the live Paddle account, create the same products/prices
   as sandbox:
   - Plus: $3.99/month, $29.99/year
   - Power: $8.99/month, $69.99/year
2. **Tax category.** Get Paddle's SaaS tax-category approval for the live
   catalog (required before live sales are fully enabled).
3. **Live webhook.** Create a webhook endpoint in the live account:
   - URL: `https://www.eciperay.com/api/billing/paddle-webhook`
   - Events: `subscription.created`, `subscription.activated`,
     `subscription.updated`, `subscription.canceled`, `subscription.past_due`,
     `transaction.completed`, `transaction.refunded`
   - Copy the endpoint's signing secret for step 5.
4. **Default payment link.** Point the live catalog's default payment link at
   `https://www.eciperay.com/pay` (the checkout-completion page Paddle.js opens
   from), mirroring the sandbox setup.
5. **Fly production secrets** (app `eciperay`):
   - `PADDLE_ENVIRONMENT=production`
   - `PADDLE_API_KEY=<live API key>`
   - `PADDLE_WEBHOOK_SECRET=<live webhook signing secret from step 3>`
   - Leave `PADDLE_API_BASE` unset (derived from the environment), or set it
     explicitly to `https://api.paddle.com`.
6. **GitHub settings** (repo `spudly/eciperay`):
   - Variable `PADDLE_ENVIRONMENT` = `production`
   - Secret `VITE_PADDLE_CLIENT_TOKEN` = the live client-side token
7. **Live price IDs.** Copy the four `pri_…` IDs from step 1 into migration
   `018_plan_prices_live.sql` (follow the instructions in that file; if it was
   already applied as a no-op, add the inserts as migration 019 instead).
8. **Deploy.** Merge + release as usual. The deploy applies the price migration,
   the server boots in production mode (watch the startup "Server environment"
   log for the Paddle entries), and the web build ships the live token.
9. **Verify.** Make one small real purchase (e.g. Plus monthly) with a real
   card, confirm the profile shows the paid plan, confirm the customer-portal
   link opens the live portal, then cancel/refund if it was only a test.

Ordering note: steps 5–7 can be done in any order, but the deploy in step 8
should only happen once all three are in place — the safety rails will
(deliberately) block a half-configured deploy/boot.

## Rollback

Set Fly secret `PADDLE_ENVIRONMENT` back to `sandbox` (and restore the sandbox
`PADDLE_API_KEY` / `PADDLE_WEBHOOK_SECRET`), set the GitHub variable
`PADDLE_ENVIRONMENT` back to `sandbox`, and redeploy. The sandbox catalog, keys,
and `plan_prices` rows are untouched by the cutover, so rollback is just
flipping the switches back.
