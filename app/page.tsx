import Link from 'next/link';
import Image from 'next/image';
import { config } from '@/lib/config';
import { products } from '@/lib/catalog';
import { ProductCard } from '@/components/product-card';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const catalog = await products();
  return (
    <>
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div className="py-6 md:pr-10">
          <p className="eyebrow">Your everyday beauty ritual</p>
          <h1 className="mt-5 text-6xl leading-[1.05] md:text-8xl">
            {config.tagline}
          </h1>
          <p className="mt-6 max-w-md leading-7 text-stone-600">
            Feel good in your skin. Discover thoughtful essentials for glowing
            days, soft moments, and a little everyday confidence.
          </p>
          <Link href="/products" className="btn mt-8">
            Shop now ↗
          </Link>
          <p className="mt-8 text-xs uppercase tracking-widest text-stone-500">
            For every shade. For every you.
          </p>
        </div>
        <div className="relative aspect-square overflow-hidden rounded-[3rem] bg-blush">
          <Image
            src="https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=1000&auto=format&fit=crop"
            alt="A warm, simple skincare ritual with beauty essentials"
            fill
            priority
            sizes="(max-width:768px) 100vw, 50vw"
            className="object-cover"
          />
          <span className="absolute bottom-6 left-6 rounded-full bg-cream/90 px-5 py-3 font-serif text-xl">
            A moment, just for you.
          </span>
        </div>
      </section>
      <section className="mt-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="eyebrow">The everyday edit</p>
            <h2 className="mt-2 text-4xl">Meet your new favourites</h2>
          </div>
          <Link href="/products" className="text-sm text-rose underline">
            View all
          </Link>
        </div>
        {catalog.length ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {catalog.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="panel">
            Our beauty edit is coming soon. Connect Supabase and run the seed to
            explore the collection.
          </div>
        )}
      </section>
      <section className="mt-20">
        <p className="eyebrow">Find your ritual</p>
        <h2 className="mt-2 text-4xl">A little of what you love</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {['Skincare', 'Makeup', 'Hair Care', 'Fragrance'].map((name, i) => (
            <Link
              key={name}
              href={
                '/products?category=' + name.toLowerCase().replace(' ', '-')
              }
              className="rounded-3xl bg-blush/60 p-8 transition hover:bg-blush"
            >
              <span className="text-xs text-rose">0{i + 1}</span>
              <h3 className="mt-8 text-3xl">{name}</h3>
              <p className="mt-3 text-sm text-rose">Explore ↗</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="mt-16 grid gap-8 border-y border-rose/10 py-10 text-center md:grid-cols-3">
        {[
          [
            'Thoughtfully selected',
            'Essentials that earn a place in your routine.',
          ],
          ['Secure checkout', 'Pay with confidence through Paystack.'],
          [
            'Made for your everyday',
            'Inclusive beauty, delivered across Nigeria.',
          ],
        ].map(([title, copy]) => (
          <div key={title}>
            <h3 className="text-2xl">{title}</h3>
            <p className="mt-2 text-sm text-stone-600">{copy}</p>
          </div>
        ))}
      </section>
    </>
  );
}
