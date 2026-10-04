import 'server-only';
import { randomUUID } from 'node:crypto';
import { adminDb } from '../supabase/server';
import { PaystackPaymentService } from './paystack';
export async function initializeOrder(order: {id:string;order_number:number;total_kobo:number}, email: string, cancelOnFailure: boolean) {
 const db = adminDb(); const reference = `CUDI-${order.order_number}-${randomUUID()}`;
 const {error} = await db.rpc('initialize_payment',{p_order_id:order.id,p_reference:reference}); if(error) throw new Error(error.message);
 try { const authorization_url = await new PaystackPaymentService().initialize({email,amount:order.total_kobo,reference,order_id:order.id}); return {authorization_url}; }
 catch(error) { await db.from('payments').update({status:'failed'}).eq('reference',reference); if(cancelOnFailure) await db.rpc('cancel_order_and_restore_stock',{p_order_id:order.id}); throw error; }
}
