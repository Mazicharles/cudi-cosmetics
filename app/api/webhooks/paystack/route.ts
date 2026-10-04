import { NextResponse, after } from 'next/server';
import { verifySignature } from '@/lib/payments/signature';
import { adminDb } from '@/lib/supabase/server';
import { processPaymentEvent } from '@/lib/payments/events';
import { referenceSchema } from '@/lib/validation';
export async function POST(request: Request) {
  const body = await request.text();
  if (Buffer.byteLength(body) > 1000000)
    return new NextResponse(null, { status: 413 });
  if (
    !verifySignature(
      body,
      request.headers.get('x-paystack-signature'),
      process.env.PAYSTACK_SECRET_KEY || '',
    )
  )
    return new NextResponse(null, { status: 401 });
  try {
    const event = JSON.parse(body);
    const parsed = referenceSchema.safeParse(event.data?.reference);
    if (event.event === 'charge.success' && parsed.success) {
      const { error } = await adminDb()
        .from('payment_events')
        .upsert(
          { reference: parsed.data },
          { onConflict: 'reference', ignoreDuplicates: true },
        );
      if (error) throw error;
      after(() => processPaymentEvent(parsed.data));
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook could not be queued', error);
    return NextResponse.json(
      { error: 'Please retry delivery' },
      { status: 503 },
    );
  }
}
export const maxDuration = 60;
