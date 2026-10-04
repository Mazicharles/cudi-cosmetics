import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { formatNaira, lagosDate } from '@/lib/money';
export const metadata = { title: 'Orders' };
export default async function Orders({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const { user, db } = await requireUser('/orders');
  const { data: orders, error } = await db
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const { payment } = await searchParams;
  return (
    <>
      <p className="eyebrow">Your beauty journey</p>
      <h1 className="mb-8 mt-3 text-5xl">Your orders</h1>
      {payment && (
        <p role="alert" className="panel mb-6">
          We could not confirm that payment yet. Open your order to check its
          status. Paystack will also notify us automatically.
        </p>
      )}
      {orders?.length ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={'/orders/' + order.id}
              className="panel flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <h2 className="text-2xl">Order #{order.order_number}</h2>
                <p className="mt-2 text-sm text-stone-500">
                  {lagosDate(order.created_at)}
                </p>
              </div>
              <span className="rounded-full bg-blush px-4 py-2 text-sm capitalize">
                {order.status}
              </span>
              <span className="font-medium text-rose">
                {formatNaira(order.total_kobo)} ↗
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="panel">
          <p>Your first beauty ritual is waiting.</p>
          <Link className="btn mt-5" href="/products">
            Shop now
          </Link>
        </div>
      )}
    </>
  );
}
