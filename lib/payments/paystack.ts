import 'server-only';
export type VerifiedTransaction = { status: string; amount: number; currency: string; reference: string; id: number; paid_at: string | null };
export type Verification = { data: VerifiedTransaction };
export interface PaymentService { initialize(input: { email: string; amount: number; reference: string; order_id: string }): Promise<string>; verify(reference: string): Promise<Verification> }
export class PaystackPaymentService implements PaymentService {
 private async request(path: string, body?: unknown) { const response = await fetch('https://api.paystack.co' + path,{ method: body ? 'POST':'GET', headers:{ Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY, 'Content-Type':'application/json' }, body:body ? JSON.stringify(body):undefined, cache:'no-store', signal:AbortSignal.timeout(15000) }); const result = await response.json(); if(!response.ok || !result.status) throw new Error('Payment provider is temporarily unavailable'); return result; }
 async initialize(input: { email: string; amount: number; reference: string; order_id: string }) { const result = await this.request('/transaction/initialize',{email:input.email,amount:input.amount,currency:'NGN',reference:input.reference,callback_url:process.env.NEXT_PUBLIC_SITE_URL + '/checkout/callback',metadata:{order_id:input.order_id}}); const url = new URL(result.data.authorization_url); if(url.protocol!=='https:' || url.hostname!=='checkout.paystack.com') throw new Error('Invalid payment URL'); return url.href; }
 async verify(reference: string): Promise<Verification> { return this.request('/transaction/verify/'+encodeURIComponent(reference)); }
}
