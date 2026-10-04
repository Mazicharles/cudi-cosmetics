'use client';
import { useEffect } from 'react';
import { useCart } from './cart-provider';
export function ConfirmationCart() {
  const cart = useCart();
  useEffect(() => {
    if (cart.ready && cart.items.length) cart.clear();
  }, [cart]);
  return null;
}
