import { NextResponse } from 'next/server';
import { serverDb, adminDb } from '@/lib/supabase/server';
import { checkoutSchema } from '@/lib/validation';
import { config } from '@/lib/config';
import { initializeOrder } from '@/lib/payments/initialize';
import { apiError, boundedJson, sameOrigin } from '@/lib/api';
export async function POST(request: Request) {
 try { if(!sameOrigin(request)) return NextResponse.json({error:'Invalid origin'},{status:403}); const db=await serverDb();const {data:{user}}=await db.auth.getUser();if(!user?.email)return NextResponse.json({error:'Please sign in'},{status:401});
 const input=checkoutSchema.parse(await boundedJson(request));const admin=adminDb();
 const {data:recent,error:recentError}=await admin.from('orders').select('id').eq('user_id',user.id).gte('created_at',new Date(Date.now()-60000).toISOString());if(recentError)throw recentError;if((recent?.length||0)>=3)return NextResponse.json({error:'Please wait a minute before trying again.'},{status:429});
 const {data:products,error:productError}=await admin.from('products').select('id,price_kobo,stock,is_active').in('id',input.items.map(i=>i.product_id));if(productError)throw productError;for(const item of input.items){const p=products?.find(p=>p.id===item.product_id);if(!p?.is_active || p.stock<item.quantity)return NextResponse.json({error:'A product is unavailable or has insufficient stock. Please update your cart.'},{status:409});}
 const {data:order,error}=await admin.rpc('create_order',{p_user_id:user.id,p_items:input.items,p_shipping:input.shipping,p_shipping_rate:config.shippingKobo,p_free_threshold:config.freeShippingThresholdKobo});if(error)throw new Error(error.message);
 try{return NextResponse.json(await initializeOrder(order,user.email,true));}catch(error){await admin.rpc('cancel_order_and_restore_stock',{p_order_id:order.id});throw error;}
 }catch(error){return apiError(error);}
}
