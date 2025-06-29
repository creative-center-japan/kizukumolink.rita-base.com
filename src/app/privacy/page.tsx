//rita-base\src\app\privacy\page.tsx

'use client';

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-blue-900">プライバシーポリシー</h1>
      <div className="text-sm text-slate-700 leading-relaxed space-y-4">
        <p>
          当サイトでは、ユーザーのプライバシー保護に最大限配慮し、「キヅクモサービス接続診断ツール」の提供にあたり、以下の情報を取得・利用します。
        </p>

        <h2 className="text-base font-semibold text-blue-800">■ 取得する情報</h2>
        <p>
          本ツールは以下の情報を一時的に取得しますが、サーバー等に保存されることはありません。
        </p>
        <ul className="list-disc list-inside ml-4">
          <li>ご利用のインターネット接続環境（外部IPアドレス、ポート応答状況など）</li>
          <li>診断実行日時</li>
          <li>WebRTC通信の接続状態（成功・失敗に関する技術的ログ）</li>
        </ul>

        <h2 className="text-base font-semibold text-blue-800">■ Cookieの使用</h2>
        <p>当サイトでは、Cookie を利用した情報収取を行いません。</p>

        <h2 className="text-base font-semibold text-blue-800">■ アクセスログ</h2>
        <p>
          診断ツールの安定運用のため、アクセスログ（アクセス日時・リクエストURL等）を一時的に収集する場合がありますが、これらは個人を特定する目的では利用されません。
        </p>

        <h2 className="text-base font-semibold text-blue-800">■ 個人情報の取り扱い</h2>
        <p>
          氏名・メールアドレス等の個人情報は、本ツールを通じて収集しておらず、外部サーバー等への送信も行いません。
        </p>

        <h2 className="text-base font-semibold text-blue-800">■ 免責事項</h2>
        <p>
          本ツールはネットワーク診断の簡易補助を目的としたものであり、診断結果の正確性・完全性を保証するものではありません。通信環境やセキュリティ設定により結果が異なる場合があります。
        </p>
      </div>

      <Link href="/" className="inline-block bg-blue-800 hover:bg-blue-900 transition text-white px-6 py-2 rounded-full text-lg text-center">
        トップページへ戻る
      </Link>
    </main>
  );
}
