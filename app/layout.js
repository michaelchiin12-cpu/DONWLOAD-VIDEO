import './globals.css';

export const metadata = {
  title: 'Batch Downloader TikTok',
  description: 'Download banyak video TikTok sekaligus dan rename otomatis sesuai nomor',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
