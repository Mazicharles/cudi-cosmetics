'use client';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { browserDb } from '@/lib/supabase/client';
import type { CartItem } from '@/lib/types';
type CartContextType = {
  items: CartItem[];
  ready: boolean;
  add: (id: string, quantity: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  notify: (message: string) => void;
};
const CartContext = createContext<CartContextType | null>(null);
const key = 'cudi-guest-cart';
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const userId = useRef<string | null>(null);
  const queue = useRef(Promise.resolve());
  const notify = (text: string) => {
    setMessage(text);
  };
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    let alive = true;
    let generation = 0;
    let loadingUser: string | null | undefined;
    const readGuest = () => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(data)
          ? data
              .filter(
                (i: CartItem) =>
                  typeof i.product_id === 'string' &&
                  Number.isInteger(i.quantity) &&
                  i.quantity > 0 &&
                  i.quantity <= 99,
              )
              .slice(0, 100)
          : [];
      } catch {
        return [];
      }
    };
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setItems(readGuest());
      setReady(true);
      return;
    }
    const db = browserDb();
    async function load(id: string | null) {
      if (!alive || loadingUser === id) return;
      loadingUser = id;
      const token = ++generation;
      setReady(false);
      try {
        if (id) {
          const { data, error } = await db
            .from('cart_items')
            .select('product_id,quantity')
            .eq('user_id', id);
          if (error) throw error;
          const merged = new Map<string, number>(
            (data || []).map((i) => [i.product_id, i.quantity]),
          );
          for (const item of readGuest())
            merged.set(
              item.product_id,
              Math.min(99, (merged.get(item.product_id) || 0) + item.quantity),
            );
          const next = Array.from(merged, ([product_id, quantity]) => ({
            product_id,
            quantity,
          }));
          if (next.length) {
            const { error } = await db.from('cart_items').upsert(
              next.map((i) => ({ ...i, user_id: id })),
              { onConflict: 'user_id,product_id' },
            );
            if (error) throw error;
          }
          if (alive && token === generation) {
            localStorage.removeItem(key);
            userId.current = id;
            setItems(next);
          }
        } else if (alive && token === generation) {
          userId.current = null;
          setItems(readGuest());
        }
      } catch {
        if (alive && token === generation) {
          loadingUser = undefined;
          setMessage('Your cart could not sync. Refresh to try again.');
        }
      } finally {
        if (alive && token === generation) setReady(true);
      }
    }
    db.auth.getUser().then(({ data }) => load(data.user?.id || null));
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user.id !== userId.current)
        setTimeout(() => load(session?.user.id || null), 0);
      if (event === 'SIGNED_OUT') setTimeout(() => load(null), 0);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  function persist(next: CartItem[], id: string, quantity: number) {
    if (!userId.current) {
      localStorage.setItem(key, JSON.stringify(next));
      return;
    }
    const uid = userId.current;
    queue.current = queue.current
      .then(async () => {
        const db = browserDb();
        const result =
          quantity > 0
            ? await db
                .from('cart_items')
                .upsert(
                  { user_id: uid, product_id: id, quantity },
                  { onConflict: 'user_id,product_id' },
                )
            : await db
                .from('cart_items')
                .delete()
                .eq('user_id', uid)
                .eq('product_id', id);
        if (result.error)
          setMessage('Cart sync failed. Refresh before checkout.');
      })
      .catch(() => setMessage('Cart sync failed. Please refresh.'));
  }
  function setQuantity(id: string, quantity: number) {
    if (!ready) return;
    const q = Math.max(0, Math.min(99, Math.floor(quantity)));
    setItems((previous) => {
      const next = q
        ? previous.some((i) => i.product_id === id)
          ? previous.map((i) =>
              i.product_id === id ? { ...i, quantity: q } : i,
            )
          : [...previous, { product_id: id, quantity: q }]
        : previous.filter((i) => i.product_id !== id);
      persist(next, id, q);
      return next;
    });
  }
  function add(id: string, quantity: number) {
    setQuantity(
      id,
      (items.find((i) => i.product_id === id)?.quantity || 0) + quantity,
    );
    notify('Added to your bag');
  }
  function clear() {
    setItems([]);
    localStorage.removeItem(key);
  }
  return (
    <CartContext.Provider
      value={{ items, ready, add, setQuantity, clear, notify }}
    >
      {children}
      {message && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-50 w-max max-w-[90vw] -translate-x-1/2 rounded-full bg-rose px-6 py-3 text-white shadow-xl"
        >
          {message}
        </div>
      )}
    </CartContext.Provider>
  );
}
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('CartProvider missing');
  return context;
}
