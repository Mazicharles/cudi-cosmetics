import { requireUser } from '@/lib/auth';
import { products } from '@/lib/catalog';
import { CheckoutForm } from '@/components/checkout-form';
export const metadata = { title: 'Checkout' };
export default async function Checkout() {
  const { user } = await requireUser('/checkout');
  return (
    <>
      <p className="eyebrow">One step closer to your ritual</p>
      <h1 className="mb-8 mt-3 text-5xl">The finishing touch.</h1>
      <CheckoutForm
        products={await products()}
        name={user.user_metadata.full_name || ''}
      />
    </>
  );
}
