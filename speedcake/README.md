# Speed Cake

Next.js App Router storefront for a Lagos cake shop. The design takes general e-commerce cues from the reference (occasion-led categories, featured cakes, configurable variants and a short cart-to-payment path) while using original Speed Cake branding and copy.

## Implementation checklist

- [x] Inspect repository and preserve existing Node distribution files.
- [x] Create responsive storefront, catalogue, product configuration, cart, checkout form, account shell and order lookup.
- [x] Add Supabase schema with RLS, storage policies, atomic order creation and status transition RPC.
- [x] Add server-side Paystack initialization and signed webhook verification.
- [x] Add protected admin read views and validated manual order progress updates.
- [ ] Finish credential-backed dynamic catalogue reads, product/category CRUD, address book, full customer order history, refund workflows, notifications and operational delivery-slot enforcement.
- [ ] Configure a Supabase project and run integration/e2e coverage against it.

## Setup

1. Install Node.js 20+ and run `npm install`.
2. Copy `.env.example` to `.env.local`, configure a Supabase project and test Paystack secret.
3. Run the SQL in `supabase/migrations/202610010001_speedcake_core.sql` in Supabase SQL editor.
4. Set `NEXT_PUBLIC_SITE_URL` to the app origin. In Paystack, configure webhook URL `/api/payments/webhook`.
5. Run `npm run dev`.

Required environment values: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY` (test secret while developing), and `NEXT_PUBLIC_SITE_URL`. Keep the service role and Paystack secrets server-side. Paystack webhook uses Paystack's HMAC signature with `PAYSTACK_SECRET_KEY`; `PAYSTACK_WEBHOOK_SECRET` is reserved and currently unused.

## First admin

Register the intended administrator through `/account`, confirm the email, then use a trusted Supabase SQL editor to promote that profile: `update public.profiles set role='admin' where id=(select id from auth.users where email='you@example.com');`. Admin privileges are never accepted from signup metadata. Protect access to the SQL editor and only promote known accounts.

## Notes

The six product examples are a local visual preview fixture, not production catalogue data. Live checkout requires active products, variants, delivery zones, Supabase credentials and a Paystack test key. Guests can submit checkout, but durable guest order attribution and secure order tracking need hardened session/token handling before production. The order lookup currently verifies order number plus email. Payment return UX, refunds, email, and automated tests remain to be implemented. The schema stores money in integer kobo.
