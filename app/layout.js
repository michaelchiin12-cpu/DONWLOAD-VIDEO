import './globals.css';

export const metadata = {
  title: 'Batch TikTok - Download & Cek Video',
  description: 'Download banyak video TikTok sekaligus, atau tampilkan semua video untuk dicek',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
