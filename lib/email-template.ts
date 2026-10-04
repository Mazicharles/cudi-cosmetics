import { config } from './config';
import { formatNaira, lagosDate } from './money';
import type { Order } from './types';
const escape = (value: string | number) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
export function orderConfirmationTemplate(
  order: Order,
  reference: string,
  siteUrl: string,
) {
  const address = [
    order.shipping_name,
    order.shipping_address1,
    order.shipping_address2,
    order.shipping_city,
    order.shipping_state,
    order.shipping_postal_code,
    order.shipping_country,
  ]
    .filter(Boolean)
    .join(', ');
  const url = siteUrl + '/orders/' + order.id;
  const subject = `Your ${config.name} order #${order.order_number} is confirmed`;
  const lines = order.order_items.map(
    (i) =>
      `${i.product_name} × ${i.quantity} — ${formatNaira(i.unit_price_kobo)} each — ${formatNaira(i.unit_price_kobo * i.quantity)}`,
  );
  const text = `${config.name}\n${config.tagline}\nThank you, ${order.shipping_name}! Payment received.\nOrder #${order.order_number}\n${lagosDate(order.created_at)}\nPayment reference: ${reference}\n${lines.join('\n')}\nSubtotal: ${formatNaira(order.subtotal_kobo)}\nShipping: ${formatNaira(order.shipping_kobo)}\nTotal: ${formatNaira(order.total_kobo)}\nDeliver to: ${address}\nPhone: ${order.shipping_phone}\nView your order: ${url}`;
  const html = `<html><body style="margin:0;background:#faf6f0;color:#352a2e;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="24"><tr><td align="center"><table role="presentation" width="600" style="max-width:100%;background:white" cellpadding="20"><tr><td style="background:#71384d;color:white"><h1 style="font-family:Georgia,serif">${config.name}</h1><p>${config.tagline}</p></td></tr><tr><td><h2>Thank you, ${escape(order.shipping_name)}!</h2><p>Payment received. Your beauty essentials are on their way to a new ritual.</p><p>Order #${order.order_number} · ${escape(lagosDate(order.created_at))}</p><p>Payment reference: ${escape(reference)}</p><table width="100%" cellpadding="8"><tr><th align="left">Item</th><th>Qty</th><th>Unit price</th><th>Total</th></tr>${order.order_items.map((i) => `<tr><td>${escape(i.product_name)}</td><td>${i.quantity}</td><td>${escape(formatNaira(i.unit_price_kobo))}</td><td>${escape(formatNaira(i.unit_price_kobo * i.quantity))}</td></tr>`).join('')}<tr><td colspan="3">Subtotal</td><td>${escape(formatNaira(order.subtotal_kobo))}</td></tr><tr><td colspan="3">Shipping</td><td>${escape(formatNaira(order.shipping_kobo))}</td></tr><tr><th colspan="3" align="left">Total</th><th>${escape(formatNaira(order.total_kobo))}</th></tr></table><h3>Shipping address</h3><p>${escape(address)}<br>${escape(order.shipping_phone)}</p><a href="${escape(url)}" style="color:#71384d">View your order</a></td></tr></table></td></tr></table></body></html>`;
  return { subject, html, text };
}
