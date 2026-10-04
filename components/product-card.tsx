import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import { formatNaira } from '@/lib/money';
export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={'/products/' + product.slug} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-blush">
        <Image
          src={product.image_url}
          alt={product.name}
          fill
          sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {!product.stock && (
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs">
            Sold out
          </span>
        )}
      </div>
      <p className="mt-4 text-xs uppercase tracking-widest text-rose/70">
        {product.size_label}
      </p>
      <h3 className="mt-1 font-serif text-xl">{product.name}</h3>
      <p className="mt-1 text-sm text-stone-600">{product.short_description}</p>
      <p className="mt-2 font-medium text-rose">
        {formatNaira(product.price_kobo)}
      </p>
    </Link>
  );
}
