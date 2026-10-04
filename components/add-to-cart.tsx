'use client';
import { useState } from 'react';
import { useCart } from './cart-provider';
export function AddToCart({ id, stock }: { id: string; stock: number }) {
  const [quantity, setQuantity] = useState(1);
  const cart = useCart();
  return (
    <div className="mt-6 flex gap-3">
      <label className="sr-only" htmlFor="quantity">
        Quantity
      </label>
      <input
        id="quantity"
        type="number"
        min={1}
        max={Math.min(99, stock)}
        value={quantity}
        onChange={(e) =>
          setQuantity(
            Math.max(1, Math.min(stock, 99, Number(e.target.value) || 1)),
          )
        }
        className="w-20"
      />
      <button
        className="btn flex-1"
        disabled={!stock || !cart.ready}
        onClick={() => cart.add(id, quantity)}
      >
        {stock ? 'Add to bag' : 'Sold out'}
      </button>
    </div>
  );
}
