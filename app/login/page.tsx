import { LoginButton } from '@/components/login-button';
import { safeNext } from '@/lib/validation';
export const metadata = { title: 'Sign in' };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="panel mx-auto max-w-md py-12 text-center">
      <p className="eyebrow">Welcome to your beauty ritual</p>
      <h1 className="mt-4 text-4xl">Hello, beautiful.</h1>
      <p className="mt-4 leading-6 text-stone-600">
        Sign in to save your bag, check out securely, and keep your orders
        close.
      </p>
      {params.error && (
        <p role="alert" className="mt-4 text-rose">
          We could not sign you in. Please try again.
        </p>
      )}
      {process.env.NEXT_PUBLIC_SUPABASE_URL ? (
        <LoginButton next={safeNext(params.next || null)} />
      ) : (
        <p className="mt-6 text-sm">
          Sign-in will be available once Supabase is configured.
        </p>
      )}
    </div>
  );
}
