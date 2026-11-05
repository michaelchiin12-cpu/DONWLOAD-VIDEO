export const runtime = 'edge';

// Mengambil alamat video (tanpa watermark bila tersedia) dari link TikTok.
export async function GET(req) {
  const url = new URL(req.url).searchParams.get('url');

  if (!url || !/^https?:\/\/([\w-]+\.)?tiktok\.com\//i.test(url)) {
    return Response.json({ error: 'Link TikTok tidak valid' }, { status: 400 });
  }

  try {
    const r = await fetch(
      'https://www.tikwm.com/api/?hd=1&url=' + encodeURIComponent(url),
      { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' }
    );
    const j = await r.json();

    if (j.code !== 0 || !j.data) {
      return Response.json({ error: j.msg || 'Video tidak ditemukan' }, { status: 502 });
    }

    const isHd = Boolean(j.data.hdplay);
    let videoUrl = j.data.hdplay || j.data.play;
    if (!videoUrl) {
      return Response.json({ error: 'Alamat video tidak tersedia' }, { status: 502 });
    }
    if (videoUrl.startsWith('/')) videoUrl = 'https://www.tikwm.com' + videoUrl;

    return Response.json({ videoUrl, quality: isHd ? 'HD' : 'Biasa' });
  } catch (e) {
    return Response.json({ error: 'Layanan pengambil video tidak bisa dihubungi' }, { status: 502 });
  }
}
