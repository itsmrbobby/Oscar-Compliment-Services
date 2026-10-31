// Optional email alert for new website requests, sent through Resend (resend.com).
// Switched on only when RESEND_API_KEY and NOTIFY_EMAIL are set as Worker settings. Never blocks or breaks a visitor's request.
const clean = (v, n) => String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, n);
export async function notifyNewRequest(env, r) {
  try {
    if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) return;
    const label = { quote: 'Quote request', contact: 'Contact message', chat: 'Chat enquiry' }[r.type] || 'Enquiry';
    const lines = [label + ' from the website', '',
      'Name: ' + (r.name || '-'), 'Phone: ' + (r.phone || '-'), 'Email: ' + (r.email || '-'), 'Page: ' + (r.page || '-'), '', r.message || '(no message)', '',
      'Open the admin inbox to mark it handled.'];
    const body = { from: clean(env.NOTIFY_FROM, 200) || 'Osca Website <onboarding@resend.dev>', to: String(env.NOTIFY_EMAIL).split(',').map((x) => x.trim()).filter(Boolean),
      subject: label + ': ' + (clean(r.name, 60) || 'new visitor'), text: lines.join('\n') };
    if (/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(r.email || '')) body.reply_to = r.email;
    await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch (e) { /* the request is already saved; a failed alert must never matter */ }
}
