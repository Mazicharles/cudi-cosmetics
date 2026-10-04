import 'server-only';
import { Resend } from 'resend';
import { adminDb } from './supabase/server';
import { orderConfirmationTemplate } from './email-template';
import type { Order } from './types';
export async function sendEmail(to: string, template: {subject:string;html:string;text:string}, key: string) { const result = await new Resend(process.env.RESEND_API_KEY).emails.send({from:process.env.EMAIL_FROM!,to,...template},{idempotencyKey:key}); if(result.error) throw new Error(result.error.message); return result.data!.id; }
export async function sendConfirmation(orderId: string, reference: string) {
 const db = adminDb(); const {data:order,error} = await db.from('orders').select('*,order_items(*)').eq('id',orderId).single(); if(error) { console.error('Email order lookup',error.message); return; }
 const {data:profile} = await db.from('profiles').select('email').eq('id',order.user_id).single(); if(!profile?.email) return;
 // A partial unique index atomically claims sending. Resend uses the same idempotency key.
 const {data:claim,error:claimError} = await db.from('email_logs').insert({order_id:orderId,recipient:profile.email,status:'sending'}).select('id').single(); if(claimError || !claim) return;
 try { const id = await sendEmail(profile.email,orderConfirmationTemplate(order as Order,reference,process.env.NEXT_PUBLIC_SITE_URL!),`order-confirmation/${orderId}`); const {error:logError} = await db.from('email_logs').update({status:'sent',provider_message_id:id}).eq('id',claim.id); if(logError) console.error('Email log update',logError.message); }
 catch(error) { console.error('Confirmation email failed',error); await db.from('email_logs').update({status:'failed',error:error instanceof Error ? error.message:'Email failed'}).eq('id',claim.id); }
}
