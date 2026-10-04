-- Durable inbox allows a quick webhook response without losing provider verification on process failure.
create table payment_events (reference text primary key, status text not null default 'pending' check(status in ('pending','processed')), error text, created_at timestamptz not null default now());
alter table payment_events enable row level security;
create index payment_events_pending on payment_events(created_at) where status='pending';
-- No public policies. Only service_role can read or mutate this operational table.
