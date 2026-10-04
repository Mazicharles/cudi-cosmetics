import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const user = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
let db: PGlite;
let product: string;
const shipping = {
  full_name: 'Ada Okafor',
  phone: '08012345678',
  address1: '12 Beauty Lane',
  address2: '',
  city: 'Ikeja',
  state: 'Lagos',
  postal_code: '',
  country: 'Nigeria',
};
async function createOrder(quantity = 1) {
  return (
    await db.query<{ id: string; total_kobo: number; order_number: number }>(
      `select * from create_order($1,$2::jsonb,$3::jsonb,250000,5000000)`,
      [
        user,
        JSON.stringify([{ product_id: product, quantity }]),
        JSON.stringify(shipping),
      ],
    )
  ).rows[0];
}
async function stock() {
  return (
    await db.query<{ stock: number }>(
      'select stock from products where id=$1',
      [product],
    )
  ).rows[0].stock;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`,
  );
  // PGlite provides built-in gen_random_uuid; production Supabase additionally has pgcrypto.
  await db.exec(
    readFileSync('supabase/migrations/001_store.sql', 'utf8').replace(
      'create extension if not exists pgcrypto;',
      '',
    ),
  );
  await db.exec(
    readFileSync('supabase/migrations/002_webhook_inbox.sql', 'utf8'),
  );
  await db.exec(readFileSync('supabase/seed.sql', 'utf8'));
  await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)', [
    user,
    'ada@example.com',
    other,
    'other@example.com',
  ]);
  product = (
    await db.query<{ id: string }>(
      "select id from products where slug='cudi-cloud-cleanser'",
    )
  ).rows[0].id;
}, 60000);
afterAll(async () => {
  await db?.close();
});
describe.sequential('real Postgres migrations and transactions', () => {
  it('seeds sixteen products and creates auth profiles', async () => {
    expect(
      (
        await db.query<{ count: number }>(
          'select count(*)::int as count from products',
        )
      ).rows[0].count,
    ).toBe(16);
    expect(
      (
        await db.query<{ email: string }>(
          'select email from profiles where id=$1',
          [user],
        )
      ).rows[0].email,
    ).toBe('ada@example.com');
  });
  it('reserves stock and uses database prices', async () => {
    const before = await stock();
    const order = await createOrder(2);
    expect(order.total_kobo).toBe(1550000);
    expect(await stock()).toBe(before - 2);
    expect(
      (
        await db.query<{ quantity: number }>(
          'select quantity from order_items where order_id=$1',
          [order.id],
        )
      ).rows[0].quantity,
    ).toBe(2);
    await db.query('select cancel_order_and_restore_stock($1)', [order.id]);
  });
  it('rejects overselling and invalid quantities atomically', async () => {
    const before = await stock();
    for (const quantity of [0, -1, 100, before + 1])
      await expect(createOrder(quantity)).rejects.toThrow();
    expect(await stock()).toBe(before);
  });
  it('rejects duplicate product IDs', async () => {
    await expect(
      db.query('select create_order($1,$2::jsonb,$3::jsonb,250000,5000000)', [
        user,
        JSON.stringify([
          { product_id: product, quantity: 1 },
          { product_id: product, quantity: 1 },
        ]),
        JSON.stringify(shipping),
      ]),
    ).rejects.toThrow('Duplicate products');
  });
  it('cancels and restores reserved stock only once', async () => {
    const before = await stock();
    const order = await createOrder();
    expect(
      (
        await db.query<{ restored: boolean }>(
          'select cancel_order_and_restore_stock($1) as restored',
          [order.id],
        )
      ).rows[0].restored,
    ).toBe(true);
    expect(
      (
        await db.query<{ restored: boolean }>(
          'select cancel_order_and_restore_stock($1) as restored',
          [order.id],
        )
      ).rows[0].restored,
    ).toBe(false);
    expect(await stock()).toBe(before);
  });
  it('finalizes once and clears the saved cart in the transaction', async () => {
    const order = await createOrder();
    const ref = 'CUDI-1-sql';
    await db.query('select initialize_payment($1,$2)', [order.id, ref]);
    await db.query(
      'insert into cart_items(user_id,product_id,quantity) values($1,$2,1)',
      [user, product],
    );
    const raw = {
      data: {
        status: 'success',
        amount: order.total_kobo,
        currency: 'NGN',
        reference: ref,
      },
    };
    const params = [ref, '123', new Date().toISOString(), JSON.stringify(raw)];
    expect(
      (
        await db.query<{ changed: boolean }>(
          'select finalize_order_payment($1,$2,$3::timestamptz,$4::jsonb) as changed',
          params,
        )
      ).rows[0].changed,
    ).toBe(true);
    expect(
      (
        await db.query<{ changed: boolean }>(
          'select finalize_order_payment($1,$2,$3::timestamptz,$4::jsonb) as changed',
          params,
        )
      ).rows[0].changed,
    ).toBe(false);
    expect(
      (await db.query('select * from cart_items where user_id=$1', [user]))
        .rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query<{ status: string }>(
          'select status from orders where id=$1',
          [order.id],
        )
      ).rows[0].status,
    ).toBe('paid');
  });
  it('revalidates payment amount inside the database', async () => {
    const order = await createOrder();
    const ref = 'CUDI-2-sql';
    await db.query('select initialize_payment($1,$2)', [order.id, ref]);
    await expect(
      db.query('select finalize_order_payment($1,$2,now(),$3::jsonb)', [
        ref,
        '124',
        JSON.stringify({
          data: {
            status: 'success',
            amount: 1,
            currency: 'NGN',
            reference: ref,
          },
        }),
      ]),
    ).rejects.toThrow('Payment verification mismatch');
    expect(
      (
        await db.query<{ status: string }>(
          'select status from orders where id=$1',
          [order.id],
        )
      ).rows[0].status,
    ).toBe('pending');
    await db.query('select cancel_order_and_restore_stock($1)', [order.id]);
  });
  it('releases expired reservations once and flags late payments', async () => {
    const before = await stock();
    const order = await createOrder();
    const ref = 'CUDI-3-sql';
    await db.query('select initialize_payment($1,$2)', [order.id, ref]);
    await db.query(
      "update orders set created_at=now()-interval '31 minutes' where id=$1",
      [order.id],
    );
    await db.exec(
      'select release_expired_orders(); select release_expired_orders();',
    );
    expect(await stock()).toBe(before);
    const raw = {
      data: {
        status: 'success',
        amount: order.total_kobo,
        currency: 'NGN',
        reference: ref,
      },
    };
    expect(
      (
        await db.query<{ changed: boolean }>(
          'select finalize_order_payment($1,$2,now(),$3::jsonb) as changed',
          [ref, '125', JSON.stringify(raw)],
        )
      ).rows[0].changed,
    ).toBe(false);
    expect(
      (
        await db.query<{ status: string }>(
          'select status from payments where reference=$1',
          [ref],
        )
      ).rows[0].status,
    ).toBe('flagged');
    expect(await stock()).toBe(before);
  });
  it('allows only one active email claim', async () => {
    const order = await createOrder();
    await db.query(
      "insert into email_logs(order_id,recipient,status) values($1,'ada@example.com','sending')",
      [order.id],
    );
    await expect(
      db.query(
        "insert into email_logs(order_id,recipient,status) values($1,'ada@example.com','sending')",
        [order.id],
      ),
    ).rejects.toThrow();
    await db.query('select cancel_order_and_restore_stock($1)', [order.id]);
  });
  it('restricts privileged functions to service role', async () => {
    for (const role of ['anon', 'authenticated']) {
      expect(
        (
          await db.query<{ allowed: boolean }>(
            "select has_function_privilege($1,'release_expired_orders()','execute') as allowed",
            [role],
          )
        ).rows[0].allowed,
      ).toBe(false);
    }
    expect(
      (
        await db.query<{ allowed: boolean }>(
          "select has_function_privilege('service_role','release_expired_orders()','execute') as allowed",
        )
      ).rows[0].allowed,
    ).toBe(true);
  });
  it('RLS isolates users and prevents client order writes', async () => {
    await db.exec(
      'grant usage on schema public,auth to authenticated;grant select,insert,update,delete on all tables in schema public to authenticated;grant usage on all sequences in schema public to authenticated;',
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      other,
    ]);
    await db.exec('set role authenticated');
    try {
      expect((await db.query('select * from orders')).rows).toHaveLength(0);
      expect((await db.query('select * from order_items')).rows).toHaveLength(
        0,
      );
      expect((await db.query('select * from payments')).rows).toHaveLength(0);
      expect((await db.query('select * from email_logs')).rows).toHaveLength(0);
      expect((await db.query('select * from profiles')).rows).toHaveLength(1);
      await expect(
        db.query(
          'insert into cart_items(user_id,product_id,quantity) values($1,$2,1)',
          [user, product],
        ),
      ).rejects.toThrow();
      await expect(
        db.query("update orders set status='paid' returning id"),
      ).resolves.toMatchObject({ rows: [] });
      expect(
        (await db.query('select * from payment_events')).rows,
      ).toHaveLength(0);
    } finally {
      await db.exec('reset role');
    }
  });
});
