# Instant Cakes Delivery

Next.js App Router cake-ordering storefront. The design takes general e-commerce cues from the reference (occasion-led categories, featured cakes, configurable variants and a short cart-to-payment path) while using original Instant Cakes Delivery branding and copy.

## Development Workflow

We follow a branch-and-PR workflow where GitHub Actions CI validates code quality and Vercel automatically handles deployments:

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make changes and validate locally**:
   Run the local validation suite before pushing:
   ```bash
   npm run ci
   ```
   Or run individual checks:
   - `npm run lint` — ESLint validation
   - `npm run typecheck` — TypeScript type validation (`tsc --noEmit`)
   - `npm test` — Automated test suite (100 unit/integration tests)
   - `npm run build` — Production Next.js build
3. **Push the branch and open a Pull Request**:
   ```bash
   git push origin feature/your-feature-name
   ```
4. **Automated CI Validation**:
   - **GitHub Actions**: Triggers on pull requests and pushes to `main`. It runs dependencies installation (`npm ci`), linting, TypeScript typechecking, the test suite, and a production build.
   - **Vercel Preview**: Generates an isolated preview deployment for every pull request via Vercel's GitHub integration.
5. **Merge to Main**:
   - Once CI passes and the pull request is approved, merge into `main`.
   - **Vercel Production**: Automatically deploys the changes to production upon merging to `main`.

## Local Validation Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Clean, reproducible dependency install matching `package-lock.json` |
| `npm run lint` | Runs Next.js ESLint checks |
| `npm run typecheck` | Runs TypeScript compiler checks without emitting files |
| `npm test` | Runs the test suite via Node test runner (`--experimental-strip-types`) |
| `npm run build` | Compiles an optimized Next.js production build |
| `npm run ci` | Runs `lint`, `typecheck`, `test`, and `build` sequentially |

## Setup

1. Install Node.js 22+ (LTS) and run `npm install` (or `npm ci`).
2. Copy `.env.example` to `.env.local`, configure a Supabase project and test Paystack secret.
3. Run the SQL migrations in `supabase/migrations` in order in Supabase SQL editor.
4. Set `NEXT_PUBLIC_SITE_URL` to the app origin. In Paystack, configure webhook URL `/api/payments/webhook`.
5. Run `npm run dev`.

Required environment values: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY` (test secret while developing), and `NEXT_PUBLIC_SITE_URL`. Keep the service role and Paystack secrets server-side. Paystack webhook uses Paystack's HMAC signature with `PAYSTACK_SECRET_KEY`.

## First admin

Create the intended administrator account through `/account`, then use a trusted Supabase SQL editor to promote that profile: `update public.profiles set role='admin' where id=(select id from auth.users where email='you@example.com');`. Admin privileges are never accepted from signup metadata. Protect access to the SQL editor and only promote known accounts.

## Notes

The old local product fixture is retained only for type/format helpers; storefront catalogue queries now return database products only. Checkout requires a signed-in customer, active products and variants, configured delivery zones, Supabase credentials and a Paystack test key. The schema stores money in integer kobo. Configure the Supabase Auth redirect allowlist for `/account` so password recovery works.
