'use client';
import { useState } from 'react';
import { useCart } from './cart-provider';
export function RetryPayment({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const { notify } = useCart();
  return (
    <button
      className="btn mt-6"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const response = await fetch(`/api/orders/${id}/retry`, {
            method: 'POST',
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          window.location.assign(result.authorization_url);
        } catch (error) {
          notify(
            error instanceof Error ? error.message : 'Payment unavailable',
          );
          setBusy(false);
        }
      }}
    >
      {busy ? 'Preparing…' : 'Retry payment with Paystack'}
    </button>
  );
}
