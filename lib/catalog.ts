import { serverDb, adminDb } from './supabase/server';
export async function products() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const db = await serverDb();
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
export async function releaseExpired() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { error } = await adminDb().rpc('release_expired_orders');
    if (error) console.error('Stock release failed', error.message);
  }
}
