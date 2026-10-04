import 'server-only';
import { adminDb } from '../supabase/server';
import { finalizePayment } from './finalize';
export async function processPaymentEvent(reference: string) {
  const db = adminDb();
  const { data: event, error } = await db
    .from('payment_events')
    .select('status')
    .eq('reference', reference)
    .single();
  if (error) throw error;
  if (event.status === 'processed') return;
  try {
    await finalizePayment(reference);
    const { error } = await db
      .from('payment_events')
      .update({ status: 'processed', error: null })
      .eq('reference', reference);
    if (error) throw error;
  } catch (error) {
    console.error('Queued webhook failed', reference, error);
    await db
      .from('payment_events')
      .update({
        error: error instanceof Error ? error.message : 'Verification failed',
      })
      .eq('reference', reference);
  }
}
export async function drainPaymentEvents() {
  const { data, error } = await adminDb()
    .from('payment_events')
    .select('reference')
    .eq('status', 'pending')
    .order('created_at')
    .limit(30);
  if (error) throw error;
  await Promise.allSettled(
    (data || []).map((event) => processPaymentEvent(event.reference)),
  );
  return data?.length || 0;
}
