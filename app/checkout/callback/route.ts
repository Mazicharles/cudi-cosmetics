import { NextResponse } from 'next/server';
import { referenceSchema } from '@/lib/validation';
import { finalizePayment } from '@/lib/payments/finalize';
import { serverDb } from '@/lib/supabase/server';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = referenceSchema.safeParse(url.searchParams.get('reference'));
  if (!parsed.success)
    return NextResponse.redirect(
      new URL('/orders?payment=failed', request.url),
    );
  try {
    const db = await serverDb();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user)
      return NextResponse.redirect(
        new URL(
          '/login?next=' + encodeURIComponent(url.pathname + url.search),
          request.url,
        ),
      );
    const { data: payment } = await db
      .from('payments')
      .select('order_id')
      .eq('reference', parsed.data)
      .single();
    if (!payment)
      return NextResponse.redirect(
        new URL('/orders?payment=failed', request.url),
      );
    const result = await finalizePayment(parsed.data);
    return NextResponse.redirect(
      new URL(
        `/orders/${result.orderId}${result.paid ? '/confirmation' : '?payment=failed'}`,
        request.url,
      ),
    );
  } catch (error) {
    console.error('Payment callback failed', error);
    return NextResponse.redirect(
      new URL('/orders?payment=unverified', request.url),
    );
  }
}
