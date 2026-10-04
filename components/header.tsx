'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { browserDb } from '@/lib/supabase/client';
import { Logo } from './logo';
import { useCart } from './cart-provider';
export function Header() {
  const { items } = useCart();
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const db = browserDb();
    db.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_, session) =>
      setUser(session?.user || null),
    );
    return () => subscription.unsubscribe();
  }, []);
  return (
    <header className="border-b border-rose/10 bg-cream">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">
        <Logo />
        <nav
          aria-label="Main navigation"
          className="flex items-center gap-5 text-sm"
        >
          <Link href="/products">Shop</Link>
          <Link href="/orders">Orders</Link>
          <Link
            href={user ? '/account' : '/login'}
            className="flex items-center gap-2"
          >
            {user?.user_metadata.avatar_url && (
              <Image
                src={user.user_metadata.avatar_url}
                width={28}
                height={28}
                alt=""
                unoptimized
                className="rounded-full"
              />
            )}
            {user
              ? String(user.user_metadata.full_name || 'Account').split(' ')[0]
              : 'Sign in'}
          </Link>
          <Link
            href="/cart"
            className="rounded-full border border-rose/25 px-4 py-2"
          >
            Bag ({items.reduce((s, i) => s + i.quantity, 0)})
          </Link>
        </nav>
      </div>
    </header>
  );
}
