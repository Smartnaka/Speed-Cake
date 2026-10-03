-- Admin order progression is atomic and intentionally cannot alter payment data.
create or replace function public.admin_update_speedcake_order_status(
  target_order uuid, next_status public.order_state, note_text text, actor_id uuid, expected_updated_at timestamptz
) returns void language plpgsql security definer set search_path=public as $$
declare o public.orders; allowed boolean;
begin
  select * into o from public.orders where id = target_order for update;
  if not found then raise exception 'Order not found'; end if;
  if o.updated_at is distinct from expected_updated_at then raise exception 'Order was updated by another administrator; refresh and try again'; end if;
  allowed := case o.status
    when 'pending_payment' then next_status in ('paid','cancelled')
    when 'paid' then next_status in ('confirmed','cancelled','refund_pending')
    when 'confirmed' then next_status in ('preparing','cancelled','refund_pending')
    when 'preparing' then next_status in ('ready','cancelled','refund_pending')
    when 'ready' then next_status in ('out_for_delivery','cancelled','refund_pending')
    when 'out_for_delivery' then next_status in ('delivered','refund_pending')
    when 'delivered' then next_status = 'refund_pending'
    when 'refund_pending' then next_status = 'refunded'
    else false end;
  if not allowed then raise exception 'Invalid order status transition'; end if;
  update public.orders set status = next_status, updated_at = now() where id = o.id;
  insert into public.order_status_history(order_id,status,note,actor_id) values(o.id,next_status,coalesce(note_text, format('Status changed from %s to %s', o.status, next_status)),actor_id);
  insert into public.audit_log(actor_id,action,entity,entity_id,details) values(actor_id,'order.status.update','orders',o.id,jsonb_build_object('from',o.status,'to',next_status));
end $$;
revoke all on function public.admin_update_speedcake_order_status(uuid,public.order_state,text,uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.admin_update_speedcake_order_status(uuid,public.order_state,text,uuid,timestamptz) to service_role;
