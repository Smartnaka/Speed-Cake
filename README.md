# Instant Cakes Delivery

Next.js App Router cake-ordering storefront. The design takes general e-commerce cues from the reference (occasion-led categories, featured cakes, configurable variants and a short cart-to-payment path) while using original Instant Cakes Delivery branding and copy.

## Implementation checklist

- [x] Inspect repository and preserve existing Node distribution files.
- [x] Create responsive storefront, catalogue, product configuration, cart, checkout form, account shell and order lookup.
- [x] Add Supabase schema with RLS, storage policies, atomic order creation and status transition RPC.
- [x] Add server-side Paystack initialization and signed webhook verification.
- [x] Add protected admin read views and validated manual order progress updates.
- [x] Make checkout and payment return account-gated and preserve the saved cart through authentication.
- [x] Require authenticated ownership for order reads and recalculate variant prices on the server.
- [ ] Finish product/category CRUD, address book, refund workflows, notifications and operational delivery-slot enforcement.
- [ ] Configure a Supabase project and run integration/e2e coverage against it.

## Setup

1. Install Node.js 20+ and run `npm install`.
2. Copy `.env.example` to `.env.local`, configure a Supabase project and test Paystack secret.
3. Run the SQL migrations in `supabase/migrations` in order in Supabase SQL editor.
4. Set `NEXT_PUBLIC_SITE_URL` to the app origin. In Paystack, configure webhook URL `/api/payments/webhook`.
5. Run `npm run dev`.

Required environment values: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY` (test secret while developing), and `NEXT_PUBLIC_SITE_URL`. Keep the service role and Paystack secrets server-side. Paystack webhook uses Paystack's HMAC signature with `PAYSTACK_SECRET_KEY`.

## First admin

Create the intended administrator account through `/account`, then use a trusted Supabase SQL editor to promote that profile: `update public.profiles set role='admin' where id=(select id from auth.users where email='you@example.com');`. Admin privileges are never accepted from signup metadata. Protect access to the SQL editor and only promote known accounts.

## Notes

The old local product fixture is retained only for type/format helpers; storefront catalogue queries now return database products only. Checkout requires a signed-in customer, active products and variants, configured delivery zones, Supabase credentials and a Paystack test key. Apply migration `202610010003_authenticated_orders.sql` before deploying the account-gated order API. The schema stores money in integer kobo. Configure the Supabase Auth redirect allowlist for `/account` so password recovery works.
