export const runtime = 'edge';

// Hanya host berikut yang boleh diproxy, supaya endpoint ini tidak bisa disalahgunakan.
const ALLOWED = ['tikwm.com', 'tiktokcdn.com', 'tiktokcdn-us.com', 'tiktokv.com', 'byteoversea.com'];

function allowed(host) {
  return ALLOWED.some((d) => host === d || host.endsWith('.' + d));
}

// Meneruskan (stream) file video ke browser agar tidak terkena blokir CORS.
export async function GET(req) {
  const u = new URL(req.url).searchParams.get('u');

  let target;
  try {
    target = new URL(u);
  } catch {
    return new Response('URL tidak valid', { status: 400 });
  }
  if (target.protocol !== 'https:' || !allowed(target.hostname)) {
    return new Response('Host tidak diizinkan', { status: 403 });
  }

  const up = await fetch(target.toString(), {
    headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.tikwm.com/' },
  });
  if (!up.ok || !up.body) {
    return new Response('Gagal mengambil file', { status: 502 });
  }

  return new Response(up.body, {
    headers: {
      'Content-Type': up.headers.get('content-type') || 'video/mp4',
      'Cache-Control': 'no-store',
    },
  });
}
