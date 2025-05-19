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
  const [status, setStatus] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [diagnosed, setDiagnosed] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);

  const renderResultCard = (item: (typeof CHECK_ITEMS)[number], idx: number) => {
    const logs = status.filter((log) => log.includes(item.keyword));
    const isOK = logs.some((log) => log.includes('OK') || log.includes('成功') || log.includes('応答あり') || log.includes('succeeded'));

    return (
      <div key={idx} className="bg-blue-900 border border-blue-500 rounded-xl p-4 shadow-xl text-white relative">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-blue-300">{item.label}</h3>
          <button
            className="text-sm text-blue-400 hover:text-blue-200"
            title="詳細はこちら"
            onClick={() => setShowDetail(item.label)}
          >❔</button>
        </div>
        <p className="text-sm text-blue-200 mb-1">{item.description}</p>
        <p className={`text-2xl font-bold text-center ${isOK ? 'text-emerald-400' : 'text-rose-400'}`}>{isOK ? 'OK' : 'NG'}</p>
      </div>
    );
  };


  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 text-gray-900 px-4 py-10">

      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-800 text-center mb-6 tracking-wide">
          キヅクモサービス接続診断ツール
        </h1>

        <p className="text-center text-sm text-gray-700 mb-8 font-semibold">
          このWeb診断ではお客様ご利用のネットワーク環境がキヅクモカメラと通信できるかを確認します。<br />
          カメラを設置する場所と映像を見る場所の両方で実施してください。<br />
          <br />
          <span className="text-xs text-gray-500 font-bold">
            ※当Web診断はサービスの品質を保証するものではございません。
          </span>
        </p>

        {loading && (
          <div className="bg-[#1b2a3a] text-blue-100 rounded-xl p-6 text-sm space-y-2 mb-10 font-semibold">
            <p>診断は1分ほどかかります。以下のステップで進行中です：</p>
            <ul className="space-y-1">
              <li className="text-green-300">フェーズ 1：キヅクモサービス疎通確認 - 完了 -</li>
              <li className="text-blue-300 animate-pulse">フェーズ 2：キヅクモサービス利用通信確認 - 実行中 -</li>
              <li className="text-gray-300">フェーズ 3：映像通信確認 - 実行待ち -</li>
            </ul>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <button
            onClick={() => { setDiagnosed(false); setStatus([]); setLoading(true); }}
            className={`px-6 py-3 ${loading ? 'bg-gray-400' : 'bg-blue-800 hover:bg-blue-900'} text-white rounded-full font-semibold shadow`}
            disabled={loading}
          >
            {loading ? '診断中...' : diagnosed ? '再診断' : '診断開始'}
          </button>

          {diagnosed && (
            <button
              onClick={() => {
                const blob = new Blob([status.join('\n')], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ritabase_check_${new Date().toISOString().slice(0, 10)}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-semibold shadow"
            >
              結果をダウンロード
            </button>
          )}

        </div>

        {diagnosed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {CHECK_ITEMS.map((item, idx) => renderResultCard(item, idx))}
          </div>
        )}

        {showDetail && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#0f1d35] border border-blue-600 rounded-xl p-4 shadow-xl text-white">

              <h2 className="text-lg font-bold text-blue-700">
                {CHECK_ITEMS.find(i => i.label === showDetail)?.label}
              </h2>

              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {CHECK_ITEMS.find(i => i.label === showDetail)?.detail}
              </p>

              {/* ❗NG理由がある場合だけ表示 */}
              {(() => {
                const item = CHECK_ITEMS.find(i => i.label === showDetail);
                const isOK = status.some(log =>
                  log.includes(item?.keyword || '') &&
                  (log.includes('OK') || log.includes('成功') || log.includes('succeeded') || log.includes('応答あり'))
                );
                return !isOK && item?.ngReason ? (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    ❗NG理由: {item.ngReason}
                  </div>
                ) : null;
              })()}

              <div className="text-right">
                <button
                  onClick={() => setShowDetail(null)}
                  className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}


      </div>
    </main>
  );
}
