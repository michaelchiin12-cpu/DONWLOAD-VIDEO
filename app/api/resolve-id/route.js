export const runtime = 'edge';

// Mengubah link TikTok (termasuk link pendek vt.tiktok.com / vm.tiktok.com)
// menjadi ID video, supaya bisa ditampilkan lewat pemutar resmi TikTok.
export async function GET(req) {
  const url = new URL(req.url).searchParams.get('url');

  if (!url || !/^https?:\/\/([\w-]+\.)?tiktok\.com\//i.test(url)) {
    return Response.json({ error: 'Link TikTok tidak valid' }, { status: 400 });
  }

  try {
    let finalUrl = url;

    // Link pendek perlu diikuti dulu sampai ketemu alamat lengkapnya.
    if (!/\/video\/\d+/.test(url)) {
      const r = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
      });
      finalUrl = r.url;
      try {
        await r.body?.cancel();
      } catch {
        /* abaikan */
      }
    }

    const m = finalUrl.match(/\/video\/(\d+)/);
    if (!m) {
      return Response.json(
        { error: 'ID video tidak ditemukan (mungkin link foto/slide atau link tidak dikenali)' },
        { status: 422 }
      );
    }

    const author = (finalUrl.match(/tiktok\.com\/@([^/?#]+)/i) || [])[1] || '';
    const canonical = author ? `https://www.tiktok.com/@${author}/video/${m[1]}` : url;

    return Response.json({ id: m[1], author, canonical });
  } catch (e) {
    return Response.json({ error: 'Gagal membuka link TikTok' }, { status: 502 });
  }
}
