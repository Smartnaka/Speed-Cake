-- Customer orders are account-owned. Keep the old guest-capable RPC revoked and
-- remove it so the only server order path requires an authenticated user ID.
alter type public.order_state add value if not exists 'refund_pending';
drop function if exists public.create_speedcake_order(text,text,text,text,text,text,text,text,date,text,uuid,bigint,bigint,jsonb);

create or replace function public.create_speedcake_order(
  buyer_id uuid,
  customer_name text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  landmark text,
  instructions text,
  delivery_date date,
  delivery_window text,
  zone_id uuid,
  delivery_charge_kobo bigint,
  total_kobo bigint,
  items jsonb
) returns public.orders
language plpgsql security definer set search_path=public as $$
declare
  o public.orders;
  calculated bigint:=0;
  line jsonb;
begin
  if buyer_id is null or not exists(select 1 from auth.users where id=buyer_id) then
    raise exception 'Authenticated customer required';
  end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items)<1 or jsonb_array_length(items)>30 then
    raise exception 'Invalid item count';
  end if;
  if delivery_date < current_date then raise exception 'Delivery date must be in the future'; end if;
  if not exists(select 1 from delivery_zones where id=zone_id and active and charge_kobo=delivery_charge_kobo) then
    raise exception 'Delivery zone unavailable';
  end if;
  for line in select * from jsonb_array_elements(items) loop
    if coalesce((line->>'quantity')::int,0) not between 1 and 30 then raise exception 'Invalid quantity'; end if;
    if not exists(
      select 1 from products p join product_variants v on v.product_id=p.id
      where p.id=(line->>'product_id')::uuid and p.active
        and v.id=(line->'variant_snapshot'->>'id')::uuid and v.active
        and v.name=line->'variant_snapshot'->>'name'
        and v.price_kobo=coalesce((line->'variant_snapshot'->>'base_price_kobo')::bigint,(line->'variant_snapshot'->>'price_kobo')::bigint)
    ) then raise exception 'Cake option unavailable or price changed'; end if;
    calculated:=calculated+(line->>'line_total_kobo')::bigint;
  end loop;
  if calculated+delivery_charge_kobo<>total_kobo then raise exception 'Total mismatch'; end if;
  insert into orders(user_id,customer_name,customer_email,customer_phone,delivery_address,city,state,landmark,delivery_instructions,delivery_zone_id,delivery_date,delivery_window,delivery_charge_kobo,subtotal_kobo,total_kobo)
  values(buyer_id,customer_name,email,phone,address,city,state,landmark,instructions,zone_id,delivery_date,delivery_window,delivery_charge_kobo,calculated,total_kobo)
  returning * into o;
  for line in select * from jsonb_array_elements(items) loop
    insert into order_items(order_id,product_id,product_snapshot,variant_snapshot,customization,quantity,line_total_kobo)
    values(o.id,(line->>'product_id')::uuid,line->'product_snapshot',line->'variant_snapshot',coalesce(line->'customization','{}'),(line->>'quantity')::int,(line->>'line_total_kobo')::bigint);
  end loop;
  insert into order_status_history(order_id,status,note) values(o.id,'pending_payment','Order placed');
  return o;
end $$;

revoke all on function public.create_speedcake_order(uuid,text,text,text,text,text,text,text,text,date,text,uuid,bigint,bigint,jsonb) from public, anon, authenticated;
grant execute on function public.create_speedcake_order(uuid,text,text,text,text,text,text,text,text,date,text,uuid,bigint,bigint,jsonb) to service_role;

create index if not exists orders_user_created_idx on public.orders(user_id,created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists payments_order_idx on public.payments(order_id);
