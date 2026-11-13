'use client';

import { useRef, useState } from 'react';

const LINE = /^\s*(\d+)\s*[.)\-:]?\s*(https?:\/\/\S+)/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIN_GAP_MS = 1300; // jeda antar permintaan agar tidak kena batas kecepatan

// Membaca resolusi asli video dari file yang sudah diunduh.
function getResolution(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement('video');
    const done = (val) => {
      URL.revokeObjectURL(url);
      resolve(val);
    };
    v.preload = 'metadata';
    v.onloadedmetadata = () =>
      done(v.videoWidth && v.videoHeight ? `${v.videoWidth}×${v.videoHeight}` : null);
    v.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
    v.src = url;
  });
}

function formatSize(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function parseLinks(text) {
  const items = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(LINE);
    if (m) items.push({ no: m[1], url: m[2], status: 'Menunggu', state: 'wait' });
  }
  return items;
}

export default function Downloader() {
  const [text, setText] = useState('');
  const [rows, setRows] = useState([]);
  const [running, setRunning] = useState(false);
  const [folderName, setFolderName] = useState('');
  const dirRef = useRef(null);
  const stopRef = useRef(false);
  const lastCall = useRef(0);

  const canPickFolder = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  function patch(i, p) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  }

  async function pickFolder() {
    try {
      const h = await window.showDirectoryPicker({ mode: 'readwrite' });
      dirRef.current = h;
      setFolderName(h.name);
    } catch {
      /* dibatalkan */
    }
  }

  async function saveFile(no, blob) {
    const name = `${no}.mp4`;
    if (dirRef.current) {
      const fh = await dirRef.current.getFileHandle(name, { create: true });
      const w = await fh.createWritable();
      await w.write(blob);
      await w.close();
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    }
  }

  async function throttle() {
    const wait = lastCall.current + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall.current = Date.now();
  }

  async function downloadOne(item, i) {
    patch(i, { status: 'Mengambil link...', state: 'run' });
    await throttle();
    const r = await fetch('/api/resolve?url=' + encodeURIComponent(item.url));
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.videoUrl) throw new Error(j.error || 'Gagal mengambil video');

    patch(i, { status: 'Mengunduh...' });
    const v = await fetch('/api/file?u=' + encodeURIComponent(j.videoUrl));
    if (!v.ok) throw new Error('Gagal mengunduh file');
    const blob = await v.blob();
    if (blob.size < 1000) throw new Error('File kosong');

    const res = await getResolution(blob);
    await saveFile(item.no, blob);
    const info = [j.quality, res, formatSize(blob.size)].filter(Boolean).join(' · ');
    patch(i, { status: `Selesai (${item.no}.mp4)`, info, state: 'ok' });
  }

  async function run(list, indexes) {
    stopRef.current = false;
    setRunning(true);
    for (const i of indexes) {
      if (stopRef.current) break;
      let done = false;
      for (let attempt = 1; attempt <= 2 && !done; attempt++) {
        try {
          await downloadOne(list[i], i);
          done = true;
        } catch (e) {
          if (attempt === 2) patch(i, { status: 'Gagal: ' + e.message, state: 'err' });
          else await sleep(1500);
        }
      }
    }
    setRunning(false);
  }

  function start() {
    const list = parseLinks(text);
    setRows(list);
    run(list, list.map((_, i) => i));
  }

  function retryFailed() {
    const idx = rows.map((r, i) => (r.state === 'err' ? i : -1)).filter((i) => i >= 0);
    idx.forEach((i) => patch(i, { status: 'Menunggu', state: 'wait' }));
    run(rows, idx);
  }

  const total = rows.length;
  const okCount = rows.filter((r) => r.state === 'ok').length;
  const errCount = rows.filter((r) => r.state === 'err').length;
  const pct = total ? Math.round(((okCount + errCount) / total) * 100) : 0;

  return (
    <>
      <div className="card">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'1. https://vt.tiktok.com/ZSp8MPYHd/\n2. https://vt.tiktok.com/xxxxxxx/\n3. ...'}
          disabled={running}
        />
        <div className="row">
          {canPickFolder && (
            <button onClick={pickFolder} disabled={running}>
              {folderName ? `Folder: ${folderName}` : 'Pilih folder simpan'}
            </button>
          )}
          <button className="primary" onClick={start} disabled={running || !text.trim()}>
            Mulai download
          </button>
          {running && <button onClick={() => (stopRef.current = true)}>Hentikan</button>}
          {!running && errCount > 0 && <button onClick={retryFailed}>Ulangi yang gagal ({errCount})</button>}
        </div>
        <p className="hint">
          {canPickFolder
            ? 'Pilih folder dulu agar semua file langsung tersimpan di sana (Chrome/Edge). Tanpa folder, browser akan mengunduh satu per satu.'
            : 'Browser ini mengunduh file satu per satu. Gunakan Chrome atau Edge untuk menyimpan langsung ke satu folder.'}
        </p>
      </div>

      {total > 0 && (
        <div className="card">
          <strong>
            {okCount} berhasil · {errCount} gagal · {total} total
          </strong>
          <div className="bar">
            <div style={{ width: pct + '%' }} />
          </div>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Link</th>
                <th>Status</th>
                <th>Kualitas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.no}</td>
                  <td className="url">{r.url}</td>
                  <td className={r.state === 'ok' ? 'ok' : r.state === 'err' ? 'err' : ''}>{r.status}</td>
                  <td>{r.info || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
