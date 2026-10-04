import { products, releaseExpired } from '@/lib/catalog';
import { ProductCard } from '@/components/product-card';
import { serverDb } from '@/lib/supabase/server';
export const metadata = { title: 'Shop' };
export const dynamic = 'force-dynamic';
export default async function Products({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  await releaseExpired();
  const params = await searchParams;
  let catalog = await products();
  const categories = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? (await (await serverDb()).from('categories').select('*')).data || []
    : [];
  if (params.category) {
    const category = categories.find((c) => c.slug === params.category);
    catalog = catalog.filter((p) => p.category_id === category?.id);
  }
  if (params.q)
    catalog = catalog.filter((p) =>
      p.name.toLowerCase().includes(params.q!.toLowerCase()),
    );
  if (params.sort === 'low')
    catalog.sort((a, b) => a.price_kobo - b.price_kobo);
  if (params.sort === 'high')
    catalog.sort((a, b) => b.price_kobo - a.price_kobo);
  return (
    <>
      <p className="eyebrow">The Cudi edit</p>
      <h1 className="mt-3 text-5xl">Your beauty, your way.</h1>
      <p className="mt-4 text-stone-600">
        Small rituals. Beautiful possibilities.
      </p>
      <form className="my-10 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="q">
          Search products
        </label>
        <input
          id="q"
          name="q"
          defaultValue={params.q}
          placeholder="Find your next favourite"
          className="min-w-0 flex-1"
          maxLength={100}
        />
        <label className="sr-only" htmlFor="category">
          Category
        </label>
        <select
          id="category"
          name="category"
          defaultValue={params.category || ''}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="sort">
          Sort
        </label>
        <select id="sort" name="sort" defaultValue={params.sort || 'new'}>
          <option value="new">Newest</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
        </select>
        <button className="btn">Explore</button>
      </form>
      <p className="mb-6 text-sm text-stone-500">{catalog.length} essentials</p>
      {catalog.length ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {catalog.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="panel">
          No products found. Try another search or category.
        </div>
      )}
    </>
  );
}
