import { requireUser } from '@/lib/auth';
import { SignOut } from '@/components/sign-out';
import Link from 'next/link';
export const metadata = { title: 'Account' };
export default async function Account() {
  const { user, db } = await requireUser('/account');
  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return (
    <div className="panel max-w-xl">
      <p className="eyebrow">Your account</p>
      <h1 className="mt-4 text-4xl">
        Hello, {profile?.full_name || 'beautiful'}.
      </h1>
      <p className="my-5">{user.email}</p>
      <div className="flex items-center gap-6">
        <Link href="/orders" className="text-rose underline">
          View your orders
        </Link>
        <SignOut />
      </div>
    </div>
  );
}
