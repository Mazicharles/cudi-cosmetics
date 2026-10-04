import { config } from './config';
export const formatNaira = (kobo: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(kobo / 100);
export const shipping = (subtotal: number) => subtotal >= config.freeShippingThresholdKobo ? 0 : config.shippingKobo;
export const cartTotal = (items: { price_kobo: number; quantity: number }[]) => items.reduce((sum, item) => sum + item.price_kobo * item.quantity, 0);
export const lagosDate = (value: string) => new Intl.DateTimeFormat('en-NG', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(new Date(value));
