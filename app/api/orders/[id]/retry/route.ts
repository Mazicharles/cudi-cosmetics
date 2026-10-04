import { NextResponse } from 'next/server';
import { serverDb } from '@/lib/supabase/server';
import { initializeOrder } from '@/lib/payments/initialize';
import { apiError, sameOrigin } from '@/lib/api';
import { z } from 'zod';
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!sameOrigin(request))
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    const db = await serverDb();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user?.email)
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 });
    const { data: order } = await db
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    if (!order)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (
      order.status !== 'pending' ||
      Date.parse(order.created_at) < Date.now() - 1800000
    )
      return NextResponse.json(
        { error: 'This order has expired. Please create a new order.' },
        { status: 409 },
      );
    return NextResponse.json(await initializeOrder(order, user.email, false));
  } catch (error) {
    return apiError(error);
  }
}
