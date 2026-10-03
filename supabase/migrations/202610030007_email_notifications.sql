-- Track transactional email status on orders to guarantee idempotency
alter table public.orders
  add column if not exists confirmation_email_sent_at timestamptz;
