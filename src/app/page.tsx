// src/app/page.tsx

'use client';

import React, { useState } from 'react';

const CHECK_ITEMS = [
  {
    label: 'ご利用IPアドレス',
    description: 'インターネットへ接続する際のIPを確認',
    keyword: '外部IP:',
    tooltip: 'ブラウザまたはSTUN candidateから抽出されたIPアドレスです',
    detail: '外部との通信に使用されるグローバルIPを表示します。',
    ngReason: 'お客様ブラウザまたはSTUN候補からIPアドレスが取得できませんでした。Proxyを利用されている可能性があります。'
  },
  {
    label: 'サービスへの通信確認',
    description: 'キヅクモサービスへの接続（TCP 443）が可能か',
    keyword: 'TCP 443',
    tooltip: 'Alarm.com サーバへ TCP接続できたかを確認します',
    detail: 'カメラサービスのクラウド連携やライブ配信に必要なポートです。443はHTTPSに使われる標準ポートです。',
    ngReason: 'Alarm.com への TCP 接続ができませんでした'
  },
  {
    label: '通信ポート確認',
    description: 'キヅクモサービス（管理用途やP2P用途）で使用するポートが接続可能か確認',
    keyword: 'TCP',
    tooltip: 'サーバ側ポートに対する接続の成功/失敗を確認します',
    detail: 'ライブビュー・管理通信・動画配信にて利用するポートが接続可能かを検査します。企業ネットワークでは一部ポートが制限されている場合があります。',
    ngReason: 'セキュリティ制御をしているファイヤーウォールやルータでのポートを制御されている可能性があります。'
  },
  {
    label: 'WebRTC接続成功',
    description: 'サーバとの通信（P2P or TURN）が確立できたか',
    keyword: 'candidate-pair: succeeded',
    tooltip: 'candidate-pair: succeeded が出たらOKです',
    detail: 'P2P通信が確立されたことを示します。通信相手との双方向通信に成功した場合のみ出力されます。',
    ngReason: 'candidate-pair: succeeded が取得できませんでした'
  },
  {
    label: '接続先情報の収集の可否',
    description: 'STUN/TURNサーバから接続するカメラやPCの情報を取得できたか',
    keyword: 'srflx',
    tooltip: 'typ srflx を含む候補があれば応答ありと判断します',
    detail: 'STUN応答により、外部に見える自分のIPやポート情報を取得します。これが取得できない場合、NATタイプの判定も難しくなります。',
    ngReason: 'typ srflx の候補が1つも見つかりませんでした'
  },
  {
    label: 'リレーサーバの利用',
    description: 'TURNサーバを経由した通信ができたか',
    keyword: 'typ relay',
    tooltip: 'typ relay を含む候補があれば中継成功と判断します',
    detail: 'STUN/TURN応答で relay タイプの候補があれば、P2Pが通らなくても通信可能な環境です。',
    ngReason: 'typ relay の候補が1つも見つかりませんでした'
  }
];

export default function Home() {
  const [status] = useState<string[]>([]);
  const [loading] = useState(false);
  const [diagnosed] = useState(true);

  return (
    <main className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-400 text-center mb-6">キヅクモ接続診断</h1>

        {loading && (
          <div className="bg-gray-800 p-4 rounded-lg text-sm space-y-2">
            <p>診断は1分ほどかかります。以下のステップで進行中です：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>・キヅクモサービス疎通確認　✅ 完了</li>
              <li className="text-blue-400 animate-pulse">・キヅクモサービス利用通信確認　🔄 確認中</li>
              <li>・映像通信確認　⏳ 未実施</li>
            </ul>
          </div>
        )}

        {diagnosed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-8">
            {CHECK_ITEMS.map((item, idx) => (
              <div key={idx} className="bg-gray-900 rounded-lg p-4 shadow border border-blue-800">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-base font-semibold text-blue-300">{item.label}</h2>
                  <span
                    className="text-blue-400 text-xs cursor-help"
                    title={item.tooltip}
                  >❔</span>
                </div>
                <p className="text-sm text-gray-300 mb-2">{item.description}</p>
                <p className="text-lg font-bold text-center text-white">--</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
