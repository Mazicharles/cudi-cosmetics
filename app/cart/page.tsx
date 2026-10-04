import { products } from '@/lib/catalog';
import { CartView } from '@/components/cart-view';
export const metadata = { title: 'Your bag' };
export const dynamic = 'force-dynamic';
export default async function Cart() {
  return (
    <>
      <h1 className="mb-8 text-5xl">A little beauty, in your bag.</h1>
      <CartView products={await products()} />
    </>
  );
}
