import { NextResponse } from 'next/server';
import { serverDb } from '@/lib/supabase/server';
import { safeNext } from '@/lib/validation';
export async function GET(request: Request){const url=new URL(request.url);const code=url.searchParams.get('code');if(code){const db=await serverDb();const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(safeNext(url.searchParams.get('next')),process.env.NEXT_PUBLIC_SITE_URL!));}return NextResponse.redirect(new URL('/login?error=oauth',request.url));}
