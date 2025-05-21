// rita-base\src\app\layout.tsx

import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'カメラ接続診断 - キヅクモ接続テスト',
  description: 'ネットワーク環境からカメラ接続が可能かを診断します。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body className="flex flex-col min-h-screen bg-blue-50 text-slate-800 dark:bg-blue-50 dark:text-slate-800">
        <main className="flex-grow bg-blue-50">{children}</main>

        <footer className="bg-blue-900 text-white text-center text-xs py-4">
          <p>© 2025 RitaBase. All rights reserved.</p>
          <div className="mt-1 space-x-4">
            <Link href="/privacy" className="underline">プライバシーポリシー</Link>
            <Link href="/contact" className="underline">お問い合わせ</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
