'use client';

import { useState } from 'react';

const PAGE_SIZE = 12; // jumlah video per halaman agar laptop tidak berat
const CONCURRENCY = 4; // berapa link dibaca bersamaan
const NUM_LINE = /^\s*(\d+)\s*[.)\-:]?\s*(https?:\/\/\S+)/;
const ANY_URL = /https?:\/\/\S+/;

// Menerima "1. https://..." maupun link polos (otomatis diberi nomor urut).
function parseLinks(text) {
  const items = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(NUM_LINE);
    if (m) {
      items.push({ no: m[1], url: m[2], state: 'wait', mark: null });
      continue;
    }
    const u = line.match(ANY_URL);
    if (u) items.push({ no: String(items.length + 1), url: u[0], state: 'wait', mark: null });
  }
  return items;
}

export default function Checker() {
  const [text, setText] = useState('');
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');

  function patch(i, p) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  }

  async function resolveOne(item, i) {
    patch(i, { state: 'run' });
    try {
      const r = await fetch('/api/resolve-id?url=' + encodeURIComponent(item.url));
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.id) throw new Error(j.error || 'Gagal membaca link');
      patch(i, { state: 'ok', id: j.id, canonical: j.canonical, author: j.author });
    } catch (e) {
      patch(i, { state: 'err', error: e.message });
    }
  }

  async function start() {
    const list = parseLinks(text);
    setRows(list);
    setPage(0);
    setCopied('');
    setLoading(true);
    let next = 0;
    const worker = async () => {
      while (next < list.length) {
        const i = next++;
        await resolveOne(list[i], i);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setLoading(false);
  }

  function setMark(i, value) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, mark: r.mark === value ? null : value } : r)));
  }

  async function copyList(kind) {
    const lines = rows
      .filter((r) => r.mark === kind)
      .map((r) => `${r.no}. ${r.canonical || r.url}`)
      .join('\n');
    if (!lines) return;
    try {
      await navigator.clipboard.writeText(lines);
      setCopied(kind);
      setTimeout(() => setCopied(''), 2500);
    } catch {
      window.prompt('Salin teks ini:', lines);
    }
  }

  const total = rows.length;
  const readyCount = rows.filter((r) => r.state === 'ok').length;
  const errCount = rows.filter((r) => r.state === 'err').length;
  const yesCount = rows.filter((r) => r.mark === 'yes').length;
  const noCount = rows.filter((r) => r.mark === 'no').length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = page * PAGE_SIZE;
  const visible = rows.slice(from, from + PAGE_SIZE);

  return (
    <>
      <div className="card">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'1. https://vt.tiktok.com/ZSp8MPYHd/\n2. https://vt.tiktok.com/xxxxxxx/\n3. ...'}
          disabled={loading}
        />
        <div className="row">
          <button className="primary" onClick={start} disabled={loading || !text.trim()}>
            {loading ? 'Memuat...' : 'Tampilkan semua video'}
          </button>
        </div>
        <p className="hint">
          Video tampil lewat pemutar resmi TikTok. Cek tanda keranjang kuning di tiap video, lalu tandai dengan
          tombol di bawahnya. Nomor yang ditandai bisa disalin.
        </p>
      </div>

      {total > 0 && (
        <>
          <div className="card">
            <strong>
              {total} link · {readyCount} siap · {errCount} gagal dibaca
            </strong>
            <div className="row">
              <span className="chip yes">🛒 Ada keranjang: {yesCount}</span>
              <span className="chip no">Tidak ada: {noCount}</span>
              <span className="chip">Belum dicek: {total - yesCount - noCount}</span>
            </div>
            <div className="row">
              <button onClick={() => copyList('yes')} disabled={!yesCount}>
                {copied === 'yes' ? 'Tersalin ✓' : 'Salin yang ada keranjang'}
              </button>
              <button onClick={() => copyList('no')} disabled={!noCount}>
                {copied === 'no' ? 'Tersalin ✓' : 'Salin yang tidak ada'}
              </button>
            </div>
          </div>

          <Pager page={page} pages={pages} setPage={setPage} />

          <div className="vgrid">
            {visible.map((r, k) => {
              const i = from + k;
              return (
                <div className={'vcard' + (r.mark ? ' m-' + r.mark : '')} key={i}>
                  <div className="vhead">
                    <strong>#{r.no}</strong>
                    {r.author && <span className="muted">@{r.author}</span>}
                  </div>

                  {r.state === 'ok' ? (
                    <iframe
                      className="vframe"
                      src={`https://www.tiktok.com/embed/v2/${r.id}`}
                      loading="lazy"
                      allow="fullscreen; encrypted-media"
                      allowFullScreen
                      title={`Video ${r.no}`}
                    />
                  ) : r.state === 'err' ? (
                    <div className="vph err">{r.error}</div>
                  ) : (
                    <div className="vph">Memuat...</div>
                  )}

                  <div className="vactions">
                    <button className={'mk yes' + (r.mark === 'yes' ? ' on' : '')} onClick={() => setMark(i, 'yes')}>
                      🛒 Ada
                    </button>
                    <button className={'mk no' + (r.mark === 'no' ? ' on' : '')} onClick={() => setMark(i, 'no')}>
                      Tidak ada
                    </button>
                    <a href={r.canonical || r.url} target="_blank" rel="noreferrer">
                      Buka di TikTok ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          <Pager page={page} pages={pages} setPage={setPage} />
        </>
      )}
    </>
  );
}

function Pager({ page, pages, setPage }) {
  if (pages <= 1) return null;
  return (
    <div className="pager">
      <button onClick={() => setPage(page - 1)} disabled={page === 0}>
        ← Sebelumnya
      </button>
      <span className="hint">
        Halaman {page + 1} / {pages}
      </span>
      <button onClick={() => setPage(page + 1)} disabled={page >= pages - 1}>
        Berikutnya →
      </button>
    </div>
  );
}
