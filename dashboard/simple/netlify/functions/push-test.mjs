// Sends one sample notification ("New intake") to the phone that asked for it. Sample only: fixed text.
import webpush from 'web-push';
import keys from './vapid.json' with { type: 'json' }; // git-ignored; bundled into the function only

const PUSH_HOSTS = /(^|\.)(push\.apple\.com|fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com)$/;

export default async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  let body;
  try { body = await req.json(); } catch { return new Response('bad json', { status: 400 }); }
  const sub = body && body.subscription;
  let host = '';
  try { host = new URL(sub.endpoint).hostname; } catch { return new Response('no subscription', { status: 400 }); }
  if (!PUSH_HOSTS.test(host)) return new Response('unsupported push service', { status: 400 });

  webpush.setVapidDetails('https://amber-dashboard-preview.netlify.app', keys.publicKey, keys.privateKey);
  await new Promise((r) => setTimeout(r, 3000));
  const payload = JSON.stringify({ title: 'New intake: Lauren Kim', body: 'Family of 3, nut allergy. Tap to see what she wrote.', url: '/?open=lauren' });
  try {
    await webpush.sendNotification(sub, payload, { TTL: 600 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, status: e.statusCode || 0 }, { status: 502 });
  }
};
