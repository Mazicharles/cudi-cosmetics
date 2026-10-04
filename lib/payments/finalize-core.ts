import type { PaymentService, Verification } from './paystack';
export type PaymentRecord = {
  order_id: string;
  amount_kobo: number;
  orders: { status: string; total_kobo: number };
};
export interface FinalizeStore {
  lookup(reference: string): Promise<PaymentRecord>;
  flag(reference: string, raw: Verification): Promise<void>;
  cancel(orderId: string, reference: string, raw: Verification): Promise<void>;
  complete(reference: string, raw: Verification): Promise<boolean>;
  email(orderId: string, reference: string): Promise<void>;
}
export async function finalizeWith(
  reference: string,
  provider: Pick<PaymentService, 'verify'>,
  store: FinalizeStore,
) {
  const payment = await store.lookup(reference);
  async function emailSafely() {
    try {
      await store.email(payment.order_id, reference);
    } catch (error) {
      console.error('Payment confirmed; email delivery failed', error);
    }
  }
  if (['paid', 'shipped', 'delivered'].includes(payment.orders.status)) {
    await emailSafely();
    return { orderId: payment.order_id, paid: true };
  }
  const raw = await provider.verify(reference);
  const tx = raw.data;
  if (
    tx.reference !== reference ||
    tx.amount !== payment.orders.total_kobo ||
    tx.amount !== payment.amount_kobo ||
    tx.currency !== 'NGN'
  ) {
    await store.flag(reference, raw);
    return { orderId: payment.order_id, paid: false };
  }
  if (tx.status === 'success') {
    const changed = await store.complete(reference, raw);
    if (changed) await emailSafely();
    const current = await store.lookup(reference);
    return {
      orderId: payment.order_id,
      paid: ['paid', 'shipped', 'delivered'].includes(current.orders.status),
    };
  }
  if (['failed', 'abandoned', 'reversed'].includes(tx.status))
    await store.cancel(payment.order_id, reference, raw);
  return { orderId: payment.order_id, paid: false };
}
