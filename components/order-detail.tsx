import { formatNaira, lagosDate } from '@/lib/money';
import type { Order } from '@/lib/types';
export function OrderDetail({ order }: { order: Order }) {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <section className="panel">
        <p className="text-sm text-stone-500">{lagosDate(order.created_at)}</p>
        <div className="my-6 space-y-5">
          {order.order_items.map((i, index) => (
            <div key={index} className="flex justify-between gap-4">
              <div>
                <h3 className="text-xl">{i.product_name}</h3>
                <p className="mt-1 text-sm text-stone-500">
                  {i.quantity} × {formatNaira(i.unit_price_kobo)}
                </p>
              </div>
              <p>{formatNaira(i.quantity * i.unit_price_kobo)}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3 border-t pt-5">
          {[
            ['Subtotal', order.subtotal_kobo],
            ['Shipping', order.shipping_kobo],
            ['Total', order.total_kobo],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span>{label}</span>
              <span>{formatNaira(Number(value))}</span>
            </div>
          ))}
        </div>
      </section>
      <aside className="panel h-fit">
        <h2 className="text-2xl">Shipping address</h2>
        <address className="mt-4 not-italic leading-7">
          {order.shipping_name}
          <br />
          {order.shipping_address1}
          <br />
          {order.shipping_address2 && (
            <>
              {order.shipping_address2}
              <br />
            </>
          )}
          {order.shipping_city}, {order.shipping_state}
          <br />
          {order.shipping_postal_code} {order.shipping_country}
          <br />
          {order.shipping_phone}
        </address>
        <p className="mt-5 text-sm capitalize">Order status: {order.status}</p>
      </aside>
    </div>
  );
}
