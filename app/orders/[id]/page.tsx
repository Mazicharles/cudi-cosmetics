import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { OrderDetail } from '@/components/order-detail';
import { RetryPayment } from '@/components/retry-payment';
import { z } from 'zod';
export const metadata = { title: 'Order details' };
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { user, db } = await requireUser('/orders/' + id);
  const { data: order, error } = await db
    .from('orders')
    .select('*,order_items(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (error || !order) notFound();
  const { data: payments } = await db
    .from('payments')
    .select('reference,status,created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: false });
  const { payment } = await searchParams;
  const expired = Date.parse(order.created_at) < Date.now() - 1800000;
  return (
    <>
      <h1 className="mb-8 text-5xl">Order #{order.order_number}</h1>
      {payment && (
        <p className="panel mb-6" role="alert">
          Payment has not been confirmed. If your account was charged, please
          wait for Paystack verification before retrying.
        </p>
      )}
      <OrderDetail order={order} />
      <div className="panel mt-6">
        <h2 className="text-2xl">Payment status</h2>
        {payments?.map((p) => (
          <p key={p.reference} className="mt-3 break-all text-sm">
            {p.reference} · <span className="capitalize">{p.status}</span>
          </p>
        ))}
        {order.status === 'pending' && !expired && <RetryPayment id={id} />}{' '}
        {order.status === 'pending' && expired && (
          <p className="mt-4">
            This reservation has expired. Stock will be released automatically;
            please create a new order.
          </p>
        )}
        {payments?.some((p) => p.status === 'flagged') && (
          <p className="mt-4 text-rose">
            This payment needs manual review. Please contact the store with your
            order number.
          </p>
        )}
      </div>
    </>
  );
}
