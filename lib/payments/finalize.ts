import 'server-only';
import { adminDb } from '../supabase/server';
import { PaystackPaymentService } from './paystack';
import { finalizeWith, type PaymentRecord } from './finalize-core';
import { sendConfirmation } from '../email';
export async function finalizePayment(reference: string) {
  const db = adminDb();
  return finalizeWith(reference, new PaystackPaymentService(), {
    async lookup(ref) {
      const { data, error } = await db
        .from('payments')
        .select('order_id,amount_kobo,orders!inner(status,total_kobo)')
        .eq('reference', ref)
        .single();
      if (error) throw new Error('Payment not found');
      return data as unknown as PaymentRecord;
    },
    async flag(ref, raw) {
      const { error } = await db
        .from('payments')
        .update({ status: 'flagged', raw_response: raw })
        .eq('reference', ref)
        .neq('status', 'success');
      if (error) throw error;
      console.error('Flagged payment verification mismatch', ref);
    },
    async cancel(id, ref, raw) {
      const { error } = await db.rpc('cancel_order_and_restore_stock', {
        p_order_id: id,
      });
      if (error) throw error;
      await db
        .from('payments')
        .update({ raw_response: raw })
        .eq('reference', ref);
    },
    async complete(ref, raw) {
      const { data, error } = await db.rpc('finalize_order_payment', {
        p_reference: ref,
        p_transaction_id: String(raw.data.id),
        p_paid_at: raw.data.paid_at || new Date().toISOString(),
        p_raw: raw,
      });
      if (error) throw error;
      return data === true;
    },
    email: sendConfirmation,
  });
}
