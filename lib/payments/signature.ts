import { createHmac, timingSafeEqual } from 'node:crypto';
export function verifySignature(body: string, signature: string | null, secret: string) { if(!secret || !signature || !/^[a-fA-F0-9]{128}$/.test(signature)) return false; const expected = createHmac('sha512',secret).update(body).digest(); return timingSafeEqual(expected,Buffer.from(signature,'hex')); }
