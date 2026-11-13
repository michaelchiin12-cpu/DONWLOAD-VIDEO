'use client';

import { useState } from 'react';
import Downloader from './Downloader';
import Checker from './Checker';

export default function Home() {
  const [mode, setMode] = useState('download');

  return (
    <main className={'wrap' + (mode === 'check' ? ' wide' : '')}>
      <h1>Batch TikTok</h1>
      <p className="sub">
        {mode === 'download'
          ? 'Tempel link bernomor, video otomatis diunduh dan dinamai sesuai nomor.'
          : 'Tempel banyak link, semua video tampil sekaligus di sini untuk dicek.'}
      </p>

      <div className="tabs">
        <button className={'tab' + (mode === 'download' ? ' active' : '')} onClick={() => setMode('download')}>
          Download video
        </button>
        <button className={'tab' + (mode === 'check' ? ' active' : '')} onClick={() => setMode('check')}>
          Cek video
        </button>
      </div>

      {/* Keduanya tetap terpasang agar proses/isi tidak hilang saat pindah tab */}
      <div hidden={mode !== 'download'}>
        <Downloader />
      </div>
      <div hidden={mode !== 'check'}>
        <Checker />
      </div>
    </main>
  );
}
