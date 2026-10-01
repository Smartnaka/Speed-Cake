You are working on the Speed Cake repository.

IMPORTANT CONTEXT:

Speed Cake is a real cake-ordering ecommerce platform.

The product experience should be inspired by the structure and ordering experience of Fastest Cakes, while having its own branding, UI, architecture and implementation.

Reference model:

* Browse cakes quickly
* Categories
* Product cards
* Cake detail pages
* Cake customization
* Price updates
* Buy/Order flow
* Cart
* Customer account
* Delivery
* Online payment
* Order tracking
* Admin/operations

Do NOT copy branding, copyrighted content, images, text, or proprietary implementation from Fastest Cakes.

Build our own Speed Cake experience based on the same type of customer journey.

==================================================
CORE CUSTOMER JOURNEY

The primary journey must be:

Homepage
→ Browse Cakes
→ Select Cake
→ Customize Cake
→ Order Cake
→ Create Account / Login
→ Delivery Details
→ Order Summary
→ Paystack
→ Payment Confirmation
→ Order Confirmation
→ Track Order

IMPORTANT ACCOUNT RULE:

A customer MUST have an account before placing an order.

Do NOT allow anonymous checkout.

A visitor can:

* browse the homepage
* browse categories
* view products
* view product details
* customize/view pricing

But when they click:

“Order Cake”
“Buy Now”
“Checkout”

they must authenticate first if they are not logged in.

If they are not logged in:

→ Create Account / Login

After successful authentication:

→ return them to the exact cake/order flow they were attempting to continue.

Do NOT lose:

* selected product
* selected variant
* flavour
* colour
* message
* add-ons
* quantity
* cart

The customer should not have to start again after signing in.

==================================================
AUTHENTICATION

Use the existing Supabase Auth implementation.

Implement:

* Sign up
* Login
* Logout
* Forgot password
* Password reset
* Persistent sessions
* Protected account pages

IMPORTANT:

REMOVE EMAIL VERIFICATION.

After signup:

Signup
→ Account created
→ Logged in
→ Continue ordering

Do NOT show:

* “Check your email”
* “Verify your email”
* “Email verification required”

Do NOT block the customer from ordering because their email is unverified.

Keep password reset functionality.

Do not weaken Supabase RLS or authorization.

==================================================
HOMEPAGE

The homepage should be a proper cake ecommerce homepage, not a generic SaaS landing page.

The first screen should immediately communicate:

* Speed Cake
* Cakes available to order
* Delivery
* Clear ordering CTA

Build:

1. Header/navigation

Include:

* Speed Cake logo/name
* Shop/Cakes
* Categories
* delivery/location information where appropriate
* account icon
* cart icon
* mobile menu

The account icon should represent:

* Login when logged out
* Account when logged in

Do not show “Sign up” permanently in the navbar unless it makes sense for the design.

2. Hero section

Strong cake imagery.

Clear copy.

Primary CTA:

“Order a Cake”

Secondary CTA can be:

“Browse Cakes”

3. Shop by category

Examples:

* Budget Cakes
* Buttercream Cakes
* Double-Layer Cakes
* Special Cakes
* Cupcakes
* Birthday Cakes
* Celebration Cakes

Categories must ultimately come from the database rather than being permanently hardcoded.

4. Popular cakes

Show real catalogue products.

Each card should include:

* image
* name
* category
* starting price / price
* availability
* quick view if appropriate
* Order Cake button

5. New / featured cakes

Use database-driven featured products.

6. Delivery section

Clearly communicate where Speed Cake delivers.

Do not invent locations or delivery promises.

Use actual configured delivery zones.

7. How ordering works

Simple:

1. Choose your cake
2. Customize it
3. Create an account
4. Choose delivery
5. Pay securely
6. We deliver
7. Footer

Include:

* Shop
* Categories
* Account
* Track Order
* Contact
* Terms
* Privacy
* Refund/return policy where applicable

==================================================
SHOP / CATALOGUE

Create a proper ecommerce catalogue.

Features:

* category filtering
* search
* sorting where useful
* product cards
* pagination/load more where appropriate
* responsive grid
* mobile-friendly layout

Product cards should feel like a real cake store.

Do not use fake catalogue data in production paths.

Products must come from Supabase.

==================================================
PRODUCT PAGE

This is one of the most important pages.

The experience should resemble a proper cake-ordering product page.

Show:

* large product images
* product name
* category
* base price
* description
* available options
* flavour
* size/variant where applicable
* colour preference
* cake message
* add-ons
* quantity
* calculated total
* availability

Example:

Cake Flavour
[Select]

Size
[Select]

Colour Preference
[Select / colour options]

Cake Message
[Input]

Add-ons
[Optional]

Quantity
[- 1 +]

Total
₦XX,XXX

[Order Cake]

The price must update as options are selected.

The final price must be recalculated server-side before creating the order.

Do not trust the price sent by the browser.

==================================================
ORDER CAKE BUTTON BEHAVIOUR

This is critical.

When a visitor clicks:

“Order Cake”

check authentication.

IF NOT LOGGED IN:

Redirect to:

/account/login

with a safe return/continue mechanism.

After login/signup:

Return the customer to the ordering flow.

IF LOGGED IN:

Continue directly to:

Cart / Order flow

Do NOT require the customer to manually find the cake again.

Preserve the customer’s selections.

==================================================
CART

Build a proper cart.

Support:

* add item
* remove item
* quantity changes
* clear cart
* product options
* add-ons
* correct totals
* empty cart
* unavailable products
* invalid configurations

Every cart item must preserve its customization.

Example:

Legacy Cake
Vanilla
8 inch
Pink
“Happy Birthday Sarah”
Quantity 1

must remain exactly that configuration.

==================================================
CHECKOUT

No guest checkout.

Customer must be authenticated.

Checkout:

1. Customer information
2. Delivery address
3. Delivery zone
4. Delivery date
5. Delivery time slot if configured
6. Order summary
7. Delivery fee
8. Total
9. Payment

Use the customer’s saved account information where available.

Allow them to save a new delivery address.

==================================================
DELIVERY

Create a proper delivery system.

Support:

* delivery zones
* delivery fees
* delivery dates
* delivery slots
* availability
* same-day rules if configured
* cutoff times if configured

All delivery calculations must happen server-side.

Do not trust delivery fees from the client.

==================================================
PAYSTACK

Use the existing Paystack integration.

Production-ready payment flow:

Create order
→ Initialize Paystack
→ Customer pays
→ Paystack callback
→ Server verifies payment
→ Webhook received
→ Webhook signature verified
→ Order/payment reconciled
→ Customer sees confirmation

Handle:

* successful payment
* failed payment
* cancelled payment
* abandoned payment
* duplicate webhook
* delayed webhook
* callback failure
* payment verification failure
* already-paid order

Never mark an order paid solely because the frontend says payment succeeded.

Keep Paystack secret keys server-side.

==================================================
ORDER SYSTEM

Orders must belong to authenticated customers.

Store:

* customer
* items
* product
* selected options
* quantity
* price
* delivery address
* delivery fee
* total
* payment reference
* payment status
* order status
* timestamps

Money must be stored in integer kobo.

Use proper order states:

pending_payment
paid
confirmed
preparing
ready
out_for_delivery
delivered
cancelled
refund_pending
refunded

Only valid state transitions should be allowed.

==================================================
CUSTOMER ACCOUNT

Build:

/account

Include:

* profile
* email
* phone
* saved addresses
* order history
* order details
* order status
* payment status
* logout

Order history should show:

Order #XXXX
Cake
Date
Amount
Status

Clicking an order opens the full order details.

==================================================
ORDER TRACKING

Customers should be able to track their authenticated orders securely.

Do not expose other customers’ orders.

Do not rely on guessable order numbers alone for authorization.

Use authenticated ownership checks and secure access mechanisms.

Show a clear order timeline:

Order placed
→ Payment confirmed
→ Confirmed
→ Preparing
→ Ready
→ Out for delivery
→ Delivered

==================================================
ADMIN

Build a proper admin dashboard.

Admin functionality:

ORDERS

* view orders
* search
* filter
* order details
* customer information
* payment status
* update order status

PRODUCTS

* create
* edit
* deactivate
* price
* variants
* images
* availability
* featured

CATEGORIES

* create
* edit
* deactivate

DELIVERY

* zones
* fees
* dates
* slots
* cutoff rules

PAYMENTS

* Paystack references
* successful
* failed
* pending
* refunds

Admin authorization MUST be server-side.

Never trust:

* browser role
* signup metadata
* frontend admin flag

==================================================
DATABASE + RLS

Audit the entire Supabase database.

Check:

* tables
* relationships
* foreign keys
* indexes
* constraints
* RLS
* storage policies
* RPC/functions
* order status transitions

Customers must only access their own:

* profile
* addresses
* orders
* order items
* payment information where appropriate

Admins must have the required operational access.

Do not disable RLS to make something work.

==================================================
SECURITY

Perform a full security audit.

Check:

* authentication
* authorization
* RLS
* IDOR
* order enumeration
* client-controlled prices
* client-controlled totals
* client-controlled payment status
* client-controlled order status
* exposed Supabase service role key
* exposed Paystack secret
* unsafe redirects
* input validation
* API authorization
* sensitive data exposure

Use Zod or the existing validation architecture.

==================================================
UX

The entire website should feel fast and simple.

A customer should be able to:

Open website
→ immediately see cakes
→ choose a cake
→ customize it
→ create account
→ continue
→ choose delivery
→ pay
→ receive confirmation

Avoid unnecessary steps.

Mobile experience is extremely important.

Make sure:

* buttons are easy to tap
* checkout forms are simple
* product images look good
* navigation works
* cart is accessible
* account is accessible
* no horizontal scrolling
* no broken layouts

==================================================
LOADING / ERROR / EMPTY STATES

Implement proper states for:

* homepage
* catalogue
* product
* cart
* checkout
* login
* signup
* account
* order history
* order details
* admin

No blank screens.

No raw database errors.

No stack traces shown to customers.

==================================================
SEO

Implement:

* page titles
* descriptions
* Open Graph metadata
* favicon
* canonical URLs where appropriate
* sitemap
* robots.txt

Use product-specific metadata where appropriate.

==================================================
PERFORMANCE

Optimize:

* images
* database queries
* unnecessary client components
* bundle size
* repeated API calls
* loading experience

Use Next.js image optimization.

Add useful database indexes.

==================================================
TESTING

Test the complete customer journey.

Test:

NEW USER:

Homepage
→ Product
→ Customize
→ Order Cake
→ Create Account
→ Return to order
→ Cart
→ Delivery
→ Paystack
→ Confirmation
→ Account
→ Order History

RETURNING USER:

Login
→ Product
→ Customize
→ Order Cake
→ Checkout
→ Paystack
→ Confirmation

Also test:

* wrong password
* duplicate email
* password reset
* empty cart
* invalid product
* unavailable product
* invalid quantity
* manipulated price
* failed payment
* abandoned payment
* duplicate webhook
* invalid webhook signature
* unauthorized order access
* unauthorized admin access

==================================================
IMPORTANT

Do not rebuild working functionality unnecessarily.

Do not introduce unnecessary dependencies.

Do not replace:

* Supabase
* Paystack
* Next.js

Do not create fake data for production flows.

Do not create fake testimonials.

Do not copy Fastest Cakes’ branding or content.

Use Fastest Cakes only as a reference for the type of cake-commerce experience we are building.

Speed Cake must have its own identity.

==================================================
EXECUTION

FIRST:

Inspect the repository thoroughly.

Inspect:

* app routes
* components
* Supabase migrations
* auth
* API routes
* cart
* checkout
* Paystack
* admin
* tests
* environment configuration

Then create a clear implementation plan based on what already exists.

Do not immediately rewrite the project.

Implement in phases:

1. Foundation/security/database
2. Authentication
3. Catalogue
4. Product customization
5. Homepage
6. Account-gated ordering flow
7. Cart
8. Checkout
9. Delivery
10. Paystack/payment reconciliation
11. Customer orders
12. Admin
13. Refunds/notifications
14. UX/accessibility/performance
15. Testing
16. Production audit

After implementation run:

npm run lint
npm run typecheck
npm run test
npm run build

Fix all errors.

Finally inspect the git diff and confirm there are no accidental changes.

Give a final report with:

* completed features
* database changes
* auth changes
* payment changes
* security changes
* tests passed
* remaining blockers

Do not call the project production-ready if there are unresolved production blockers.