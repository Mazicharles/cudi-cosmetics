create extension if not exists pgcrypto;
create type order_status as enum ('pending','paid','shipped','delivered','cancelled');
create type payment_status as enum ('initialized','success','failed','flagged');
create table profiles (id uuid primary key references auth.users on delete cascade, email text not null, full_name text, avatar_url text, created_at timestamptz not null default now());
create table categories (id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null);
create table products (id uuid primary key default gen_random_uuid(), category_id uuid not null references categories, name text not null, slug text unique not null, short_description text not null, description text not null, ingredients text not null, how_to_use text not null, size_label text not null, price_kobo integer not null check(price_kobo>0), currency text not null default 'NGN' check(currency='NGN'), image_url text not null, stock integer not null check(stock>=0), is_active boolean not null default true, created_at timestamptz not null default now());
create table cart_items (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, product_id uuid not null references products, quantity integer not null check(quantity between 1 and 99), unique(user_id,product_id));
create table orders (id uuid primary key default gen_random_uuid(), order_number bigint generated always as identity unique, user_id uuid not null references auth.users, status order_status not null default 'pending', subtotal_kobo integer not null check(subtotal_kobo>0), shipping_kobo integer not null check(shipping_kobo>=0), total_kobo integer not null check(total_kobo=subtotal_kobo+shipping_kobo), currency text not null default 'NGN' check(currency='NGN'), shipping_name text not null, shipping_phone text not null, shipping_address1 text not null, shipping_address2 text, shipping_city text not null, shipping_state text not null, shipping_postal_code text, shipping_country text not null default 'Nigeria' check(shipping_country='Nigeria'), created_at timestamptz not null default now(), paid_at timestamptz);
create table order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references orders, product_id uuid not null references products, product_name text not null, unit_price_kobo integer not null check(unit_price_kobo>0), quantity integer not null check(quantity between 1 and 99));
create table payments (id uuid primary key default gen_random_uuid(), order_id uuid not null references orders, provider text not null default 'paystack', reference text unique not null, amount_kobo integer not null check(amount_kobo>0), currency text not null default 'NGN' check(currency='NGN'), status payment_status not null default 'initialized', provider_transaction_id text unique, raw_response jsonb, created_at timestamptz not null default now(), paid_at timestamptz);
create table email_logs (id uuid primary key default gen_random_uuid(), order_id uuid not null references orders, recipient text not null, status text not null check(status in ('sending','sent','failed')), error text, provider_message_id text, created_at timestamptz not null default now());
create unique index email_once on email_logs(order_id) where status in ('sending','sent');
create index products_category on products(category_id);
create index cart_product on cart_items(product_id);
create index orders_user on orders(user_id);
create index orders_expiry on orders(created_at) where status='pending';
create index order_items_order on order_items(order_id);
create index order_items_product on order_items(product_id);
create index payments_order on payments(order_id);
create index email_logs_order on email_logs(order_id);
-- Unique constraints already index products.slug, payments.reference, and cart_items.user_id.
alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table cart_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table email_logs enable row level security;
create policy public_categories on categories for select using(true);
create policy public_products on products for select using(is_active);
create policy own_profile_read on profiles for select to authenticated using(id=auth.uid());
create policy own_profile_write on profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy own_profile_insert on profiles for insert to authenticated with check(id=auth.uid());
create policy own_cart on cart_items for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy own_orders on orders for select to authenticated using(user_id=auth.uid());
create policy own_order_items on order_items for select to authenticated using(exists(select 1 from orders where orders.id=order_id and user_id=auth.uid()));
create policy own_payments on payments for select to authenticated using(exists(select 1 from orders where orders.id=order_id and user_id=auth.uid()));
create policy own_emails on email_logs for select to authenticated using(exists(select 1 from orders where orders.id=order_id and user_id=auth.uid()));
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into profiles(id,email,full_name,avatar_url) values(new.id,coalesce(new.email,''),new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'avatar_url'); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
create function create_order(p_user_id uuid,p_items jsonb,p_shipping jsonb,p_shipping_rate integer,p_free_threshold integer) returns orders language plpgsql security definer set search_path=public as $$
declare item record; product products; result orders; subtotal integer:=0; delivery integer;
begin
 if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Invalid cart'; end if;
 if exists(select 1 from jsonb_to_recordset(p_items) as x(product_id uuid,quantity integer) where quantity is null or quantity not between 1 and 99 or product_id is null) then raise exception 'Invalid quantity'; end if;
 if (select count(*) from jsonb_to_recordset(p_items) as x(product_id uuid,quantity integer)) <> (select count(distinct product_id) from jsonb_to_recordset(p_items) as x(product_id uuid,quantity integer)) then raise exception 'Duplicate products'; end if;
 -- Lock products in stable UUID order to avoid deadlocks between carts.
 for item in select * from jsonb_to_recordset(p_items) as x(product_id uuid,quantity integer) order by product_id loop
  select * into product from products where id=item.product_id and is_active for update;
  if not found or product.stock<item.quantity then raise exception 'A product is unavailable or has insufficient stock'; end if;
  subtotal:=subtotal+product.price_kobo*item.quantity;
 end loop;
 delivery:=case when subtotal>=p_free_threshold then 0 else p_shipping_rate end;
 insert into orders(user_id,subtotal_kobo,shipping_kobo,total_kobo,shipping_name,shipping_phone,shipping_address1,shipping_address2,shipping_city,shipping_state,shipping_postal_code,shipping_country) values(p_user_id,subtotal,delivery,subtotal+delivery,p_shipping->>'full_name',p_shipping->>'phone',p_shipping->>'address1',p_shipping->>'address2',p_shipping->>'city',p_shipping->>'state',p_shipping->>'postal_code',p_shipping->>'country') returning * into result;
 for item in select * from jsonb_to_recordset(p_items) as x(product_id uuid,quantity integer) order by product_id loop
  select * into product from products where id=item.product_id;
  insert into order_items(order_id,product_id,product_name,unit_price_kobo,quantity) values(result.id,product.id,product.name,product.price_kobo,item.quantity);
  update products set stock=stock-item.quantity where id=product.id;
 end loop;
 return result;
end; $$;
create function cancel_order_and_restore_stock(p_order_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare current_order orders; item record;
begin
 select * into current_order from orders where id=p_order_id for update;
 if not found or current_order.status<>'pending' then return false; end if;
 for item in select product_id,quantity from order_items where order_id=p_order_id order by product_id loop update products set stock=stock+item.quantity where id=item.product_id; end loop;
 update orders set status='cancelled' where id=p_order_id;
 update payments set status='failed' where order_id=p_order_id and status='initialized';
 return true;
end; $$;
create function finalize_order_payment(p_reference text,p_transaction_id text,p_paid_at timestamptz,p_raw jsonb) returns boolean language plpgsql security definer set search_path=public as $$
declare current_order orders; payment payments;
begin
 select * into payment from payments where reference=p_reference;
 if not found then raise exception 'Unknown payment'; end if;
 select * into current_order from orders where id=payment.order_id for update;
 select * into payment from payments where reference=p_reference for update;
 if current_order.status in ('paid','shipped','delivered') then return false; end if;
 -- Never fulfill a late charge after reserved stock was released. Flag for manual refund.
 if current_order.status<>'pending' or current_order.created_at<now()-interval '30 minutes' then
  perform cancel_order_and_restore_stock(current_order.id);
  update payments set status='flagged',raw_response=p_raw where id=payment.id; return false;
 end if;
 if p_raw->'data'->>'status' is distinct from 'success' or (p_raw->'data'->>'amount')::bigint is distinct from current_order.total_kobo::bigint or p_raw->'data'->>'currency' is distinct from 'NGN' or p_raw->'data'->>'reference' is distinct from p_reference or payment.amount_kobo<>current_order.total_kobo then raise exception 'Payment verification mismatch'; end if;
 update payments set status='success',provider_transaction_id=p_transaction_id,paid_at=p_paid_at,raw_response=p_raw where id=payment.id;
 update orders set status='paid',paid_at=p_paid_at where id=current_order.id;
 delete from cart_items where user_id=current_order.user_id;
 return true;
end; $$;
create function release_expired_orders() returns integer language plpgsql security definer set search_path=public as $$
declare item record; released integer:=0;
begin
 for item in select id from orders where status='pending' and created_at<now()-interval '30 minutes' order by id for update skip locked loop
  if cancel_order_and_restore_stock(item.id) then released:=released+1; end if;
 end loop; return released;
end; $$;
-- Transaction-scoped checkout/retry lock: one payment attempt per pending order at a time.
create function initialize_payment(p_order_id uuid,p_reference text) returns payments language plpgsql security definer set search_path=public as $$
declare current_order orders; result payments;
begin
 select * into current_order from orders where id=p_order_id for update;
 if not found or current_order.status<>'pending' or current_order.created_at<now()-interval '30 minutes' then raise exception 'Order cannot be paid'; end if;
 if exists(select 1 from payments where order_id=p_order_id and status='initialized' and created_at>now()-interval '1 minute') then raise exception 'Payment is already being prepared. Please wait a minute before retrying.'; end if;
 insert into payments(order_id,reference,amount_kobo) values(p_order_id,p_reference,current_order.total_kobo) returning * into result; return result;
end; $$;
revoke all on function handle_new_user() from public;
revoke all on function create_order(uuid,jsonb,jsonb,integer,integer),cancel_order_and_restore_stock(uuid),finalize_order_payment(text,text,timestamptz,jsonb),release_expired_orders(),initialize_payment(uuid,text) from public,anon,authenticated;
grant execute on function create_order(uuid,jsonb,jsonb,integer,integer),cancel_order_and_restore_stock(uuid),finalize_order_payment(text,text,timestamptz,jsonb),release_expired_orders(),initialize_payment(uuid,text) to service_role;
