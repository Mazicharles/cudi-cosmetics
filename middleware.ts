import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
export async function middleware(request: NextRequest) {
 let response = NextResponse.next({request});
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL) return response;
 const db = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll:()=>request.cookies.getAll(),setAll:values=>{values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
 const {data:{user}} = await db.auth.getUser();
 if(!user && /^\/(checkout|orders|account)(\/|$)/.test(request.nextUrl.pathname) && request.nextUrl.pathname!=='/checkout/callback') { const url = request.nextUrl.clone(); url.pathname='/login';url.search='';url.searchParams.set('next',request.nextUrl.pathname+request.nextUrl.search); const redirect=NextResponse.redirect(url);response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));return redirect; }
 return response;
}
export const config = {matcher:['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)']};
