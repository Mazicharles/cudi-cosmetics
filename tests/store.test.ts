import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { cartTotal, formatNaira, shipping, lagosDate } from '../lib/money';
import { shippingSchema, checkoutSchema, safeNext } from '../lib/validation';
import { verifySignature } from '../lib/payments/signature';
import {
  finalizeWith,
  type FinalizeStore,
  type PaymentRecord,
} from '../lib/payments/finalize-core';
import { orderConfirmationTemplate } from '../lib/email-template';
import type { Order } from '../lib/types';
const address = {
  full_name: 'Ada Okafor',
  phone: '08012345678',
  address1: '12 Beauty Lane',
  city: 'Ikeja',
  state: 'Lagos',
  country: 'Nigeria',
};
describe('Naira and shipping', () => {
  it('calculates integer cart totals', () => {
    expect(
      cartTotal([
        { price_kobo: 350000, quantity: 2 },
        { price_kobo: 650000, quantity: 1 },
      ]),
    ).toBe(1350000);
    expect(cartTotal([])).toBe(0);
  });
  it('includes the free threshold', () => {
    expect(shipping(4999999)).toBe(250000);
    expect(shipping(5000000)).toBe(0);
    expect(shipping(5000001)).toBe(0);
  });
  it('formats kobo as NGN', () => {
    expect(formatNaira(350050)).toMatch(/₦3,500\.50/);
    expect(formatNaira(0)).toMatch(/₦0\.00/);
  });
  it('uses Lagos dates', () =>
    expect(lagosDate('2026-01-01T23:30:00Z')).toContain('2 January 2026'));
});
describe('checkout validation', () => {
  for (const phone of [
    '08012345678',
    '08112345678',
    '07012345678',
    '09012345678',
    '09112345678',
    '+2348012345678',
    '+2349112345678',
  ])
    it('accepts ' + phone, () =>
      expect(shippingSchema.safeParse({ ...address, phone }).success).toBe(
        true,
      ),
    );
  for (const phone of [
    '123',
    '0801234567',
    '+23408012345678',
    '+18012345678',
    '06012345678',
  ])
    it('rejects ' + phone, () =>
      expect(shippingSchema.safeParse({ ...address, phone }).success).toBe(
        false,
      ),
    );
  it('rejects unknown states and foreign countries', () => {
    expect(
      shippingSchema.safeParse({ ...address, state: 'Unknown' }).success,
    ).toBe(false);
    expect(
      shippingSchema.safeParse({ ...address, country: 'Ghana' }).success,
    ).toBe(false);
  });
  it('allows optional fields', () =>
    expect(shippingSchema.parse(address).postal_code).toBe(''));
  it('rejects invalid quantities and price tampering', () => {
    for (const quantity of [0, -1, 1.5, 100])
      expect(
        checkoutSchema.safeParse({
          shipping: address,
          items: [
            { product_id: '11111111-1111-4111-8111-111111111111', quantity },
          ],
        }).success,
      ).toBe(false);
    expect(
      checkoutSchema.safeParse({
        shipping: address,
        items: [
          {
            product_id: '11111111-1111-4111-8111-111111111111',
            quantity: 1,
            price: 1,
          },
        ],
      }).success,
    ).toBe(false);
  });
  it('prevents external redirects', () => {
    expect(safeNext('//evil.com')).toBe('/account');
    expect(safeNext('/\\evil.com')).toBe('/account');
    expect(safeNext('/checkout')).toBe('/checkout');
  });
});
describe('webhook signatures', () => {
  const raw = '{"event":"charge.success"}';
  const secret = 'test-secret';
  const signature = createHmac('sha512', secret).update(raw).digest('hex');
  it('accepts raw signed bodies', () =>
    expect(verifySignature(raw, signature, secret)).toBe(true));
  it('rejects tampering and malformed signatures', () => {
    expect(verifySignature(raw + ' ', signature, secret)).toBe(false);
    expect(verifySignature(raw, 'abc', secret)).toBe(false);
    expect(verifySignature(raw, null, secret)).toBe(false);
    expect(verifySignature(raw, signature, '')).toBe(false);
  });
});
function fixture(status = 'pending') {
  const record: PaymentRecord = {
    order_id: 'order-1',
    amount_kobo: 600000,
    orders: { status, total_kobo: 600000 },
  };
  let sent = false;
  let emailCount = 0;
  const store: FinalizeStore = {
    lookup: vi.fn(async () => record),
    flag: vi.fn(async () => {}),
    cancel: vi.fn(async () => {
      record.orders.status = 'cancelled';
    }),
    complete: vi.fn(async () => {
      if (record.orders.status === 'paid') return false;
      record.orders.status = 'paid';
      return true;
    }),
    email: vi.fn(async () => {
      if (!sent) {
        sent = true;
        emailCount++;
      }
    }),
  };
  const verify = vi.fn(async () => ({
    data: {
      status: 'success',
      amount: 600000,
      currency: 'NGN',
      reference: 'CUDI-1-test',
      id: 123,
      paid_at: '2026-01-01T10:00:00Z',
    },
  }));
  return { store, verify, record, getEmailCount: () => emailCount };
}
describe('payment finalization', () => {
  it('finalizes once and is idempotent', async () => {
    const f = fixture();
    expect((await finalizeWith('CUDI-1-test', f, f.store)).paid).toBe(true);
    await finalizeWith('CUDI-1-test', f, f.store);
    expect(f.verify).toHaveBeenCalledTimes(1);
    expect(f.store.complete).toHaveBeenCalledTimes(1);
    expect(f.getEmailCount()).toBe(1);
  });
  it('handles racing webhook and callback', async () => {
    const f = fixture();
    await Promise.all([
      finalizeWith('CUDI-1-test', f, f.store),
      finalizeWith('CUDI-1-test', f, f.store),
    ]);
    expect(f.getEmailCount()).toBe(1);
    expect(f.record.orders.status).toBe('paid');
  });
  it('flags mismatched amounts', async () => {
    const f = fixture();
    f.record.amount_kobo = 1;
    expect((await finalizeWith('CUDI-1-test', f, f.store)).paid).toBe(false);
    expect(f.store.flag).toHaveBeenCalledOnce();
    expect(f.store.complete).not.toHaveBeenCalled();
    expect(f.store.email).not.toHaveBeenCalled();
  });
  it('flags currency and reference mismatches', async () => {
    for (const update of [{ currency: 'USD' }, { reference: 'wrong' }]) {
      const f = fixture();
      f.verify.mockResolvedValue({
        data: { ...(await f.verify()).data, ...update },
      });
      await finalizeWith('CUDI-1-test', f, f.store);
      expect(f.store.flag).toHaveBeenCalledOnce();
    }
  });
  it('cancels terminal failures and keeps processing pending', async () => {
    for (const status of ['failed', 'abandoned', 'pending']) {
      const f = fixture();
      f.verify.mockResolvedValue({
        data: { ...(await f.verify()).data, status },
      });
      await finalizeWith('CUDI-1-test', f, f.store);
      expect(f.store.cancel).toHaveBeenCalledTimes(
        status === 'pending' ? 0 : 1,
      );
      expect(f.store.email).not.toHaveBeenCalled();
    }
  });
});
describe('confirmation template', () => {
  const order: Order = {
    id: 'order-1',
    order_number: 42,
    user_id: 'user-1',
    status: 'paid',
    subtotal_kobo: 700000,
    shipping_kobo: 250000,
    total_kobo: 950000,
    created_at: '2026-01-01T23:30:00Z',
    shipping_name: 'Ada <script>',
    shipping_phone: '08012345678',
    shipping_address1: '12 Beauty Lane',
    shipping_address2: '',
    shipping_city: 'Ikeja',
    shipping_state: 'Lagos',
    shipping_postal_code: '',
    shipping_country: 'Nigeria',
    order_items: [
      {
        product_name: 'Cudi Cloud Cleanser',
        unit_price_kobo: 350000,
        quantity: 2,
      },
    ],
  };
  it('contains branding, items, totals and link in both formats', () => {
    const t = orderConfirmationTemplate(
      order,
      'CUDI-42-test',
      'https://example.com',
    );
    expect(t.subject).toBe('Your Cudi Cometics order #42 is confirmed');
    for (const body of [t.html, t.text]) {
      for (const value of [
        'Cudi Cometics',
        'Cudi Cloud Cleanser',
        'CUDI-42-test',
        '₦9,500.00',
        'Ikeja',
        'https://example.com/orders/order-1',
        '2 January 2026',
      ])
        expect(body).toContain(value);
    }
    expect(t.html).toContain('Ada &lt;script&gt;');
    expect(t.html).not.toContain('Ada <script>');
    expect(t.html).toContain('<table');
  });
});
