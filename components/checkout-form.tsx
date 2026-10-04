'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useCart } from './cart-provider';
import { states } from '@/lib/config';
import { checkoutSchema } from '@/lib/validation';
import { cartTotal, formatNaira, shipping } from '@/lib/money';
import type { Product } from '@/lib/types';
export function CheckoutForm({
  products,
  name,
}: {
  products: Product[];
  name: string;
}) {
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lines = cart.items.flatMap((i) => {
    const p = products.find((p) => p.id === i.product_id);
    return p ? [{ ...p, quantity: i.quantity }] : [];
  });
  const subtotal = cartTotal(lines);
  const total = subtotal + shipping(subtotal);
  if (!cart.ready) return <p role="status">Syncing your bag…</p>;
  if (!cart.items.length)
    return (
      <div className="panel">
        Your bag is empty.{' '}
        <Link href="/products" className="text-rose underline">
          Discover the collection
        </Link>
      </div>
    );
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const parsed = checkoutSchema.safeParse({
      shipping: Object.fromEntries(form),
      items: cart.items,
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(' · '));
      return;
    }
    if (
      lines.length !== cart.items.length ||
      lines.some((i) => i.quantity > i.stock)
    ) {
      setError('Please update unavailable items in your bag.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign(result.authorization_url);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Checkout could not start. Please try again.';
      setError(message);
      cart.notify(message);
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="panel">
        <h2 className="mb-6 text-3xl">Where shall we deliver?</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {[
            ['full_name', 'Full name', name, 'name'],
            ['phone', 'Phone number', '', 'tel'],
            ['address1', 'Address line 1', '', 'address-line1'],
            ['address2', 'Address line 2 (optional)', '', 'address-line2'],
            ['city', 'City', '', 'address-level2'],
          ].map(([field, label, value, complete]) => (
            <label key={field} className="flex flex-col gap-2 text-sm">
              {label}
              <input
                name={field}
                defaultValue={value}
                autoComplete={complete}
                required={!['address2'].includes(field)}
                maxLength={200}
                type={field === 'phone' ? 'tel' : 'text'}
                placeholder={field === 'phone' ? '08012345678' : undefined}
              />
            </label>
          ))}
          <label className="flex flex-col gap-2 text-sm">
            State
            <select name="state" required defaultValue="">
              <option value="" disabled>
                Select your state
              </option>
              {states.map((state) => (
                <option key={state}>{state}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Postal code (optional)
            <input
              name="postal_code"
              autoComplete="postal-code"
              maxLength={20}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Country
            <input
              name="country"
              value="Nigeria"
              readOnly
              autoComplete="country-name"
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-5 text-sm text-rose">
            {error}
          </p>
        )}
      </div>
      <aside className="panel h-fit">
        <h2 className="text-3xl">Your essentials</h2>
        <div className="my-6 space-y-4">
          {lines.map((i) => (
            <div key={i.id} className="flex justify-between gap-4 text-sm">
              <span>
                {i.name} × {i.quantity}
              </span>
              <span className="shrink-0">
                {formatNaira(i.price_kobo * i.quantity)}
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-3 border-t pt-5">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatNaira(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{formatNaira(shipping(subtotal))}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>{formatNaira(total)}</span>
          </div>
        </div>
        <button disabled={busy} className="btn mt-6 w-full">
          {busy
            ? 'Preparing your payment…'
            : `Pay ${formatNaira(total)} with Paystack`}
        </button>
        <p className="mt-4 text-center text-xs leading-5 text-stone-500">
          You will securely complete payment on Paystack. Your order reserves
          stock for 30 minutes.
        </p>
      </aside>
    </form>
  );
}
