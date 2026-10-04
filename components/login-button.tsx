'use client';
import { browserDb } from '@/lib/supabase/client';
import { useCart } from './cart-provider';
import { useState } from 'react';
export function LoginButton({ next }: { next: string }) {
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      className="btn mt-6 w-full"
      onClick={async () => {
        setBusy(true);
        try {
          const { error } = await browserDb().auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo:
                process.env.NEXT_PUBLIC_SITE_URL +
                '/auth/callback?next=' +
                encodeURIComponent(next),
            },
          });
          if (error) throw error;
        } catch {
          cart.notify('Sign-in is unavailable. Please try again.');
          setBusy(false);
        }
      }}
    >
      {' '}
      {busy ? 'Connecting…' : 'Sign in with Google'}
    </button>
  );
}
