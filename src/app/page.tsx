// src/app/page.tsx

'use client';
import React, { useState, useEffect } from 'react';

// スケール計算関数
function useScaleFactor() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const height = window.innerHeight;
      const neededHeight = 720; // 想定レイアウトの高さ
      const factor = Math.min(1, height / neededHeight);
      setScale(Number(factor.toFixed(2)));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return scale;
}


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
    keyword: 'サービスへの通信確認',
    tooltip: 'Alarm.com サーバへ TCP接続できたかを確認します',
    detail: 'カメラサービスのクラウド連携やライブ配信に必要なポートです。443はHTTPSに使われる標準ポートです。',
    ngReason: 'Alarm.com への TCP 接続ができませんでした'
  },
  {
    label: '通信ポート確認',
    description: 'キヅクモサービス（管理用途やP2P用途）で使用するポートが接続可能か確認',
    keyword: 'ポート確認:',
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
  const scale = useScaleFactor();
  const [status, setStatus] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [diagnosed, setDiagnosed] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [phase, setPhase] = useState<1 | 2 | 3 | null>(null); // フェーズ状態追加


  //WebRTC2の接続チェック
  const runWebRTCCheck = async () => {
    const logs: string[] = [];
    console.log("✅ WebRTCログ:", logs);

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:3.80.218.25:3478' },
        { urls: 'turn:3.80.218.25:3478', username: 'test', credential: 'testpass' }
      ]
    });

    const allCandidates: RTCIceCandidate[] = [];

    const channel = pc.createDataChannel('test');

    channel.onopen = () => {
      console.log("📢 channel.onopen fired");
      logs.push('✅ WebRTC: DataChannel open!');
      channel.send('hello from client');
      logs.push('candidate-pair: succeeded');
      setStatus(prev => [...prev, ...logs]);
    };

    channel.onmessage = (event) => {
      logs.push(`📨 サーバからのメッセージ: ${event.data}`);
      setStatus(prev => [...prev, ...logs]);
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const res = await fetch('https://webrtc-answer.rita-base.com/offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sdp: offer.sdp, type: offer.type })
    });

    const answer = await res.json();
    await pc.setRemoteDescription(answer);

    pc.onicecandidate = async (event) => {
      console.log("🔥 ICE candidate:", event.candidate); // ログとり用
      if (event.candidate) {
        allCandidates.push(event.candidate);
        const cand = event.candidate.candidate;

        if (cand.includes("typ srflx")) {
          logs.push("srflx: 応答あり");
        }
        if (cand.includes("typ relay")) {
          logs.push("typ relay: 中継成功");
        }

        await fetch('https://webrtc-answer.rita-base.com/ice-candidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidate: event.candidate,
            pc_id: answer.pc_id
          })
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        logs.push("❌ WebRTC接続に失敗しました");
        setStatus(prev => [...prev, ...logs]);
      }
    };

    // ✅ ここで ICE Gathering 完了まで待つ
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === "complete") {
        resolve();
      } else {
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === "complete") {
            resolve();
          }
        };
      }
    });

    // 全体のステータス更新
    setStatus(prev => [...prev, ...logs]);
  };

  // runDiagnosis フェーズ連動
  const runDiagnosis = async () => {
    setLoading(true);
    setDiagnosed(false);
    setPhase(1);
    const logs: string[] = [];


    try {
      // 外部IP取得
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        logs.push(`外部IP: ${data.ip}`);
      } catch {
        logs.push("外部IP: 取得失敗");
      }

      // Alarm.com 接続チェック
      try {
        const res = await fetch("/api/fqdncheck");
        const result = await res.text();

        if (result.startsWith("OK")) {
          logs.push(`サービスへの通信確認: ${result}`);
        } else {
          logs.push(`サービスへの通信確認: NG (${result})`);
        }
      } catch (err) {
        logs.push(`サービスへの通信確認: NG (エラー: ${(err as Error).message})`);
      }

      setStatus([...logs]);
      setPhase(2);

      // 通信ポート確認
      setPhase(2);
      try {
        const res = await fetch("https://check-api.rita-base.com/check-json");
        const data = await res.json();

        logs.push(`📅 実行日時: ${data.timestamp}`);
        logs.push(`診断結果: ${data.status === "OK" ? "🟢 OK" : "🔴 NG"}`);
        logs.push("🔸 TCPポート確認:");
        for (const [port, result] of Object.entries(data.tcp)) {
          logs.push(`ポート確認: TCP ${port} → ${result === "success" ? "成功" : "失敗"}`);
        }
        logs.push("🔸 UDPポート確認:");
        for (const [port, result] of Object.entries(data.udp)) {
          logs.push(`ポート確認: UDP ${port} → ${result === "success" ? "応答あり" : "応答なし"}`);
        }

        if (data.failed_ports.length > 0) {
          logs.push("❌ NGとなったポート一覧:");
          logs.push(...(data.failed_ports as string[]).map((p: string) => ` - ${p}`));
        }

        setStatus(logs);
      } catch (err) {
        logs.push(`ポート確認取得失敗: ${(err as Error).message}`);
        setStatus(logs);
        setDiagnosed(true);
        return;
      }

      // ✅ WebRTC診断完了まで待ってから診断完了扱いにする
      setPhase(3);
      await runWebRTCCheck();

      await new Promise(resolve => setTimeout(resolve, 10000));

      setDiagnosed(true);

    } catch {
      logs.push("❌ サーバとの接続に失敗しました");
      setStatus(logs);
      setDiagnosed(true);

    }
  };

  const renderResultCard = (item: (typeof CHECK_ITEMS)[number], idx: number) => {
    let ipAddress = '取得失敗'; // Default value for IP address

    // Extract the IP address from the status logs
    if (item.keyword === '外部IP:') {
      const logs = status.filter((log) => log.includes(item.keyword));
      const ipLog = logs.find(log => log.startsWith('外部IP:'));
      ipAddress = ipLog ? ipLog.split('外部IP: ')[1] : '取得失敗';
    }

    // 各チェック項目の判定ロジック
    const logsForItem = status.filter(log => log.includes(item.keyword));

    let isOK = false;

    if (item.label === 'サービスへの通信確認') {
      isOK = logsForItem.some(log =>
        log.trim().startsWith("サービスへの通信確認: OK")
      );
    } else if (item.label === 'WebRTC接続成功') {
      isOK = logsForItem.some(log =>
        log.includes("candidate-pair: succeeded")
      );
    } else {
      isOK = logsForItem.some(log =>
        log.includes("OK") || log.includes("成功") || log.includes("応答あり")
      );
    }

    return (
      <div
        key={idx}
        className="bg-white text-gray-800 border border-gray-200 shadow-md w-full max-w-[360px] p-4 rounded-xl"
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">{item.label}</h3>
          <button
            className="text-sm text-gray-500 hover:text-gray-800"
            title="詳細はこちら"
            onClick={() => setShowDetail(item.label)}
          >
            ❔
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-1">{item.description}</p>
        <p className={`text-3xl font-bold text-center ${item.keyword === '外部IP:' ? 'text-emerald-500' : (isOK ? 'text-emerald-500' : 'text-rose-500')}`}>
          {item.keyword === '外部IP:' ? ipAddress : (isOK ? 'OK' : 'NG')}
        </p>
        {!isOK && logsForItem.find(log => log.includes("NG")) && (
          <p className="text-xs text-red-500 mt-1 whitespace-pre-wrap">
            {logsForItem.find(log => log.includes("NG"))}
          </p>
        )}
      </div>
    );
  };

  return (
    <div>

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 text-gray-900 px-4 sm:px-6 pt-4 sm:pt-8 pb-12 sm:pb-16 text-base sm:text-lg">

        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }} className="transition-transform duration-300">
          <div className="max-w-[96%] mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-blue-800 text-center mb-6 tracking-wide">
              キヅクモサービス接続診断ツール
            </h1>


            <p className="text-center text-sm sm:text-base md:text-lg text-gray-700 mb-6 font-semibold leading-relaxed">
              このWeb診断ではお客様ご利用のネットワーク環境がキヅクモカメラと通信できるかを確認します。<br />
              カメラを設置する場所と映像を見る場所の両方で実施してください。
              <br />
              <span className="text-xs sm:text-sm text-gray-500 font-bold">
                ※当Web診断はサービスの品質を保証するものではございません。
              </span>
            </p>

            {loading && !diagnosed && (
              <div className="bg-[#1b2a3a] text-blue-100 rounded-xl p-4 sm:p-6 text-sm sm:text-base space-y-4 mb-10 font-semibold">
                <p>診断は1分ほどかかります。以下のステップで進行中です：</p>


                <ul className="space-y-1">
                  <li className={`${phase === 1
                    ? "text-blue-300 animate-pulse"
                    : (phase ?? 0) > 1
                      ? "text-green-300"
                      : "text-gray-300"
                    }`}>
                    フェーズ 1：キヅクモサービス疎通確認 - {(phase ?? 0) > 1 ? "完了" : phase === 1 ? "実行中" : "未実行"} -
                  </li>

                  <li className={`${phase === 2
                    ? "text-blue-300 animate-pulse"
                    : (phase ?? 0) > 2
                      ? "text-green-300"
                      : "text-gray-300"
                    }`}>
                    フェーズ 2：キヅクモサービス利用通信確認 - {(phase ?? 0) > 2 ? "完了" : phase === 2 ? "実行中" : "未実行"} -
                  </li>

                  <li className={`${phase === 3 && !diagnosed
                    ? "text-blue-300 animate-pulse"
                    : diagnosed
                      ? "text-green-300"
                      : "text-gray-300"
                    }`}>
                    フェーズ 3：映像通信確認 - {diagnosed ? "完了" : phase === 3 ? "実行中" : "未実行"} -
                  </li>
                </ul>


              </div>
            )}

            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {(!loading && !diagnosed) && (
                <button onClick={runDiagnosis} className="w-full sm:w-auto max-w-[200px] h-[44px] px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-full font-semibold shadow text-base sm:text-lg text-center whitespace-nowrap">
                  診断開始
                </button>
              )}

              {diagnosed && (
                <button onClick={runDiagnosis} className="w-full sm:w-auto max-w-[200px] h-[44px] px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-full font-semibold shadow text-base sm:text-lg text-center whitespace-nowrap">
                  再診断
                </button>
              )}

              {loading && !diagnosed && (
                <button onClick={() => {
                  setLoading(false);
                  setStatus([]);
                }} className="w-full sm:w-auto max-w-[200px] h-[44px] px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-full font-semibold shadow text-base sm:text-lg text-center whitespace-nowrap">
                  キャンセル
                </button>
              )}

              {diagnosed && (
                <button onClick={() => {
                  const blob = new Blob([status.join('\n')], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `ritabase_check_${new Date().toISOString().slice(0, 10)}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }} className="w-full sm:w-auto max-w-[200px] h-[44px] px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-full font-semibold shadow text-base sm:text-lg text-center whitespace-nowrap">
                  結果をダウンロード
                </button>
              )}
            </div>

            {diagnosed && (
              <div className="grid grid-cols-[repeat(auto-fit,_minmax(280px,_1fr))] gap-4 px-2 sm:px-4 mx-auto max-w-[96%]">
                {CHECK_ITEMS.map((item, idx) => renderResultCard(item, idx))}
              </div>
            )}

            {showDetail && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white border border-gray-300 rounded-xl p-6 sm:p-8 shadow-xl text-gray-900 max-w-lg w-full">
                  <h2 className="text-xl font-bold text-blue-700 mb-4">
                    {CHECK_ITEMS.find(i => i.label === showDetail)?.label}
                  </h2>

                  <p className="text-base text-gray-700 whitespace-pre-wrap mb-4">
                    {CHECK_ITEMS.find(i => i.label === showDetail)?.detail}
                  </p>

                  {(() => {
                    const item = CHECK_ITEMS.find(i => i.label === showDetail);
                    const isOK = status.some(log =>
                      log.includes(item?.keyword || '') &&
                      (log.includes('OK') || log.includes('成功') || log.includes('succeeded') || log.includes('応答あり'))
                    );
                    return !isOK && item?.ngReason ? (
                      <div className="text-base text-red-600 bg-red-100 border border-red-300 p-3 rounded mb-4">
                        ❗NG理由: {item.ngReason}
                      </div>
                    ) : null;
                  })()}

                  <div className="text-right">
                    <button
                      onClick={() => setShowDetail(null)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-base"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );

} 
