import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { OrderDetail } from '@/components/order-detail';
import { ConfirmationCart } from '@/components/confirmation-cart';
export const metadata = { title: 'Order confirmed' };
export default async function Confirmation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, db } = await requireUser(`/orders/${id}/confirmation`);
  const { data: order } = await db
    .from('orders')
    .select('*,order_items(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (!order) notFound();
  if (!['paid', 'shipped', 'delivered'].includes(order.status))
    redirect('/orders/' + id);
  return (
    <>
      <ConfirmationCart />
      <div className="mb-10 text-center">
        <p className="eyebrow">Payment received</p>
        <h1 className="mt-4 text-5xl">Thank you, beautiful.</h1>
        <p className="mt-4 text-stone-600">
          Your {`Cudi Cometics`} order #{order.order_number} is confirmed. A
          little beauty is headed your way.
        </p>
      </div>
      <OrderDetail order={order} />
      <div className="mt-8 flex justify-center gap-6">
        <Link href={'/orders/' + id} className="btn">
          View order
        </Link>
        <Link href="/products" className="btn">
          Keep exploring
        </Link>
      </div>
    </>
  );
}
