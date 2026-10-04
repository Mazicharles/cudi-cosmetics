import { serverDb } from './supabase/server';
import { redirect } from 'next/navigation';
export async function requireUser(path: string) {
  const db = await serverDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/login?next=' + encodeURIComponent(path));
  return { user, db };
}
