'use client';
import { browserDb } from '@/lib/supabase/client';
import { useCart } from './cart-provider';
export function SignOut() {
  const { notify } = useCart();
  return (
    <button
      className="btn"
      onClick={async () => {
        const { error } = await browserDb().auth.signOut();
        if (error) notify('Could not sign out. Please try again.');
        else window.location.assign('/');
      }}
    >
      Sign out
    </button>
  );
}
