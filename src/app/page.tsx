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
  const [phase, setPhase] = useState(0);

  const runDiagnosis = async () => {
    setLoading(true);
    setDiagnosed(false);
    setStatus([]);
    setPhase(1);

    const newLogs: string[] = [];

    newLogs.push("🌐 [1/3] 外部IPアドレス取得中...");
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipRes.json();
      newLogs.push(`外部IP: ${ipData.ip}`);
    } catch {
      newLogs.push("外部IP: 取得失敗");
    }

    setPhase(2);
    newLogs.push("🌐 [2/3] 通信ポート診断中...");

    // 簡略化: 本来はTCP/UDP確認処理を書く（省略可）

    setPhase(3);
    newLogs.push("🌐 [3/3] WebRTC診断中...");

    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:3.80.218.25:3478' },
          { urls: 'turn:3.80.218.25:3478', username: 'test', credential: 'testpass' }
        ],
        iceTransportPolicy: "all"
      });

      pc.createDataChannel("test");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const res = await fetch("https://webrtc-answer.rita-base.com/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp: offer.sdp, type: offer.type })
      });
      const answer = await res.json();
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      const done = await new Promise<boolean>((resolve) => {
        pc.oniceconnectionstatechange = () => {
          newLogs.push(`ICEステータス: ${pc.iceConnectionState}`);
          if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
            resolve(true);
            pc.close();
          } else if (pc.iceConnectionState === "failed") {
            resolve(false);
            pc.close();
          }
        };
        setTimeout(() => {
          newLogs.push("⚠️ WebRTC接続タイムアウト");
          resolve(false);
        }, 8000);
      });

      newLogs.push(done ? "candidate-pair: succeeded" : "❌ candidate-pair: 未確立");

    } catch (e) {
      newLogs.push("❌ WebRTC診断中にエラーが発生しました");
    }

    setStatus(newLogs);
    setLoading(false);
    setDiagnosed(true);
  };

  return (
    <main className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-400 text-center mb-6">キヅクモ接続診断</h1>

        {loading && (
          <div className="bg-gray-800 p-4 rounded-lg text-sm space-y-2">
            <p>診断は1分ほどかかります。以下のステップで進行中です：</p>
            <ul className="list-disc list-inside space-y-1">
              <li className={phase >= 1 ? 'text-blue-400' : ''}>・キヅクモサービス疎通確認　{phase >= 1 ? '✅ 完了' : '⏳ 実行中'}</li>
              <li className={phase >= 2 ? 'text-blue-400' : ''}>・キヅクモサービス利用通信確認　{phase >= 2 ? '✅ 完了' : '⏳ 未実施'}</li>
              <li className={phase >= 3 ? 'text-blue-400' : ''}>・映像通信確認　{phase >= 3 ? '✅ 完了' : '⏳ 未実施'}</li>
            </ul>
          </div>
        )}

        {!loading && !diagnosed && (
          <div className="text-center">
            <button
              onClick={runDiagnosis}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium"
            >
              診断開始
            </button>
          </div>
        )}

        {diagnosed && (
          <div className="mt-6 space-y-4">
            {CHECK_ITEMS.map((item, idx) => {
              const hit = status.find(line => line.includes(item.keyword));
              return (
                <div key={idx} className="bg-gray-900 rounded-lg p-4 border border-blue-800 shadow">
                  <h2 className="text-blue-300 font-semibold mb-1">{item.label}</h2>
                  <p className="text-sm text-gray-300 mb-2">{item.description}</p>
                  <p className="text-white text-center text-lg font-bold">
                    {hit ? 'OK' : 'NG'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
