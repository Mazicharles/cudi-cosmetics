'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from './cart-provider';
import type { Product } from '@/lib/types';
import { cartTotal, formatNaira, shipping } from '@/lib/money';
import { config } from '@/lib/config';
export function CartView({ products }: { products: Product[] }) {
  const cart = useCart();
  const lines = cart.items.flatMap((i) => {
    const p = products.find((p) => p.id === i.product_id);
    return p ? [{ ...p, quantity: i.quantity }] : [];
  });
  const subtotal = cartTotal(lines);
  if (!cart.ready) return <p role="status">Loading your bag…</p>;
  if (!cart.items.length)
    return (
      <div className="panel">
        <h2 className="text-3xl">Your next ritual starts here.</h2>
        <p className="my-4">Your bag is waiting for a little beauty.</p>
        <Link href="/products" className="btn">
          Explore the shop
        </Link>
      </div>
    );
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
      <div className="space-y-4">
        {cart.items.map((i) => {
          const p = products.find((p) => p.id === i.product_id);
          return (
            <div key={i.product_id} className="panel flex items-center gap-5">
              {p && (
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl">
                  <Image
                    src={p.image_url}
                    alt={p.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <Link
                  href={p ? '/products/' + p.slug : '/products'}
                  className="font-serif text-xl"
                >
                  {p?.name || 'Unavailable product'}
                </Link>
                {p && (
                  <p className="mt-1 text-sm">
                    {formatNaira(p.price_kobo)} · {p.size_label}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <label className="sr-only" htmlFor={'qty-' + i.product_id}>
                    Quantity for {p?.name || 'product'}
                  </label>
                  <input
                    id={'qty-' + i.product_id}
                    className="w-20"
                    type="number"
                    min={1}
                    max={99}
                    value={i.quantity}
                    onChange={(e) =>
                      cart.setQuantity(
                        i.product_id,
                        Number(e.target.value) || 1,
                      )
                    }
                  />
                  <button
                    onClick={() => cart.setQuantity(i.product_id, 0)}
                    className="text-sm text-rose underline"
                  >
                    Remove
                  </button>
                </div>
                {p && i.quantity > p.stock && (
                  <p className="mt-2 text-sm text-rose">
                    Only {p.stock} available. Update your quantity.
                  </p>
                )}
              </div>
              {p && (
                <span className="text-sm font-medium">
                  {formatNaira(p.price_kobo * i.quantity)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <aside className="panel h-fit">
        <h2 className="text-3xl">Your bag</h2>
        <div className="mt-6 flex justify-between">
          <span>Subtotal</span>
          <span>{formatNaira(subtotal)}</span>
        </div>
        <div className="mt-3 flex justify-between">
          <span>Shipping</span>
          <span>{formatNaira(shipping(subtotal))}</span>
        </div>
        <div className="mt-5 flex justify-between border-t pt-5 font-medium">
          <span>Total</span>
          <span>{formatNaira(subtotal + shipping(subtotal))}</span>
        </div>
        <p className="mt-4 text-sm text-stone-500">
          Free shipping from {formatNaira(config.freeShippingThresholdKobo)}.
        </p>
        <Link href="/checkout" className="btn mt-6 w-full">
          Continue to checkout
        </Link>
      </aside>
    </div>
  );
}
