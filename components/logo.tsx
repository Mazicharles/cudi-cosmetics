import Link from 'next/link';
import { config } from '@/lib/config';
export function Logo() {
  return (
    <Link
      href="/"
      aria-label={`${config.name} home`}
      className="font-serif text-2xl tracking-tight text-rose"
    >
      {config.name}
      <span className="ml-1 text-sm">✧</span>
    </Link>
  );
}
