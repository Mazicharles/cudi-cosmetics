import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/server';
import { drainPaymentEvents } from '@/lib/payments/events';
export async function GET(request: Request) {if(!process.env.CRON_SECRET||request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return new NextResponse(null,{status:401});try{const processed=await drainPaymentEvents();const {data,error}=await adminDb().rpc('release_expired_orders');if(error)throw error;return NextResponse.json({released:data,processed});}catch(error){console.error('Maintenance failed',error);return NextResponse.json({error:'Maintenance failed'},{status:503});}}
export const POST=GET;
export const maxDuration=60;
