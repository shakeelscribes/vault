import '@/styles/globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Toaster } from 'react-hot-toast';

const font = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['300','400','500','600','700','800'] });

export const viewport = {
  themeColor: '#7C3AED',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata = {
  title: 'Vault',
  description: 'Track every rupee in real time. Canara Bank SMS → instant dashboard.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Vault' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={font.className}>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){var t=localStorage.getItem('vault_theme')||'light';if(t==='light')document.documentElement.setAttribute('data-theme','light');else document.documentElement.removeAttribute('data-theme');})();`
        }} />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
