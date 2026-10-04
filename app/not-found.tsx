import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="panel">
      <h1 className="text-4xl">This page has wandered off</h1>
      <Link href="/products" className="btn mt-6">
        Explore the shop
      </Link>
    </div>
  );
}
