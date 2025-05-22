// rita-base\src\app\layout.tsx

import './globals.css';

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
      <body className="bg-blue-50 text-slate-800 overflow-x-hidden">
        <div className="flex flex-col min-h-screen">
          <main className="h-screen flex flex-col justify-between px-6 py-6 text-xl">
            {children}
          </main>

          <footer className="bg-blue-900 text-white text-center text-sm py-4">
            <p className="mb-1">© 2025 RitaBase. All rights reserved.</p>
            <div className="space-x-6">
              <a href="/privacy" className="underline hover:text-gray-300">プライバシーポリシー</a>
              <a href="/contact" className="underline hover:text-gray-300">お問い合わせ</a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}


