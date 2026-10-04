import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { products } from '@/lib/catalog';
import { formatNaira } from '@/lib/money';
import { AddToCart } from '@/components/add-to-cart';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = (await products()).find((p) => p.slug === slug);
  return { title: p?.name || 'Product' };
}
export default async function ProductDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = (await products()).find((p) => p.slug === slug);
  if (!product) notFound();
  return (
    <>
      <Link href="/products" className="text-sm text-rose">
        ← Back to the edit
      </Link>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-blush">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            priority
            sizes="(max-width:768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div className="py-4">
          <p className="eyebrow">{product.size_label}</p>
          <h1 className="mt-4 text-5xl">{product.name}</h1>
          <p className="mt-3 text-lg text-stone-600">
            {product.short_description}
          </p>
          <p className="mt-5 text-2xl text-rose">
            {formatNaira(product.price_kobo)}
          </p>
          <p className="mt-3 text-sm">
            {product.stock
              ? 'In stock · Ready for your ritual'
              : 'Currently sold out'}
          </p>
          <AddToCart id={product.id} stock={product.stock} />
          <p className="mt-7 leading-7 text-stone-600">{product.description}</p>
          <div className="mt-8 space-y-4">
            {[
              ['Key ingredients', product.ingredients],
              ['How to use', product.how_to_use],
              ['Size', product.size_label],
            ].map(([title, value]) => (
              <details key={title} className="border-t border-rose/15 py-4">
                <summary className="cursor-pointer font-medium">
                  {title}
                </summary>
                <p className="mt-3 leading-6 text-stone-600">{value}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
