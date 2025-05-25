'use client';
import React, { useState, useEffect } from 'react';

// スケール計算関数
function useScaleFactor() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // スマホ（横幅が768px未満）の場合のみスケーリングを適用
      if (width < 768) {
        const neededHeight = 720;
        const factor = Math.min(1, height / neededHeight);
        setScale(Number(factor.toFixed(2)));
      } else {
        setScale(1); // PCはスケーリングなし
      }
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
    tooltip: 'ブラウザまたは当テスト通信より抽出されたIPアドレスです',
    detail: 'お客様が外部インターネットに接続する際に使われているグローバルIPアドレスを表示します。',
    ngReason: 'ブラウザまたは当テスト通信からグローバルIPアドレスを取得できませんでした。Proxyを経由している場合や、カメラ通信（WebRTC）が遮断されている場合に発生します。\n\n今後の対応：\nIPアドレスが取得できなくても、通信そのものに問題がなければご利用可能です。\nただし、Proxy経由などで外部IPが不明な場合は、接続判定が一部正確に行えないことがあります。\n社内のネットワーク機器設定や、情報システム部門にご確認ください。'
  },
  {
    label: 'サービスへの通信確認',
    description: 'キヅクモサービスへの接続（TCP 443）が可能か',
    keyword: 'サービスへの通信確認',
    tooltip: 'キヅクモサービス サーバへ TCP接続できたかを確認します',
    detail: 'キヅクモのサービス（Alarm.com）へ、HTTPS通信（TCP 443番）で接続できるか確認します。',
    ngReason: 'キヅクモのクラウドサービス（Alarm.com）へのHTTPS接続に失敗しました。\nセキュリティ機器やWebフィルタ、DNS制限などが原因の可能性があります。\n\n今後の対応：\nこの通信ができないと、カメラの映像配信や設定取得が行えません。\nネットワーク管理者または情報システム部門へ「キヅクモサービスで利用するドメインでの外部TCP 443番ポートの通信許可」が必要であることをお伝えください。'
  },
  {
    label: '通信ポート確認',
    description: 'キヅクモサービス（管理用途やP2P用途）で使用するポートが接続可能か確認',
    keyword: 'ポート確認:',
    tooltip: 'サーバ側ポートに対する接続の成功/失敗を確認します',
    detail: 'キヅクモで利用する各種ポート（TCP/UDP）が開いているかを確認します。映像配信やリモート管理などに必要です。',
    ngReason: 'キヅクモが使用する一部の通信ポートで接続がブロックされていることが確認されました。\nファイアウォールやUTMなどで制限されている可能性があります。\n\n今後の対応：\n制限されているポートを解除することで、映像の途切れや接続不良を回避できます。\n社内のネットワーク設定や機器の管理者にご相談ください。必要なポート一覧のご案内も可能です。'
  },
  {
    label: 'WebRTC接続成功',
    description: 'サーバとの通信（P2P or TURN）が確立できたか',
    keyword: 'candidate-pair: succeeded',
    tooltip: 'candidate-pair: succeeded が出たらOKです',
    detail: 'カメラとお客様の端末間で、WebRTCという技術を使ってリアルタイム通信ができるかを確認します。',
    ngReason: 'ブラウザからカメラとの通信を確立できませんでした。DataChannelの開通に失敗しています。\nネットワーク制限、Proxy、ブラウザ制限（古いバージョンや社内ポリシー）が原因となる場合があります。\n\n今後の対応：\nWebRTC通信ができない場合、一部機能（リアルタイム映像確認等）が制限されます。\n最新のChrome等をご利用のうえ、Proxyやファイアウォール設定をご確認ください。'
  },
  {
    label: 'リレーサーバの利用',
    description: 'TURNサーバを経由した通信ができたか',
    keyword: 'typ relay',
    tooltip: 'typ relay を含む候補があれば中継成功と判断します',
    detail: 'カメラとの直接通信ができない場合に備え、中継サーバを経由した接続が可能かを確認します。',
    ngReason: '中継サーバ（TURN）経由での通信が確立できませんでした。UDPポート制限や認証失敗が考えられます。\n\n今後の対応：\nP2P通信ができない環境では中継サーバが必要となります。\nネットワーク管理者に「UDP通信の制限があるか」「外部中継サーバの利用可否」をご確認ください。'
  }
];


export default function Home() {
  const scale = useScaleFactor();
  const [status, setStatus] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [diagnosed, setDiagnosed] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [phase, setPhase] = useState<1 | 2 | 3 | null>(null);


// -------------------------
// WebRTC診断（DataChannelの接続確認）
// - STUN/TURNを通してP2PまたはTURN中継通信が成功するか確認
// - 成功時は DataChannel open と candidate-pair をログ出力
// -------------------------
  const runWebRTCCheck = async (): Promise<string[]> => {
    const logs: string[] = [];

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:3.80.218.25:3478' },
        { urls: 'turn:3.80.218.25:3478', username: 'test', credential: 'testpass' }
      ],
      iceCandidatePoolSize: 2
    });

    const channel = pc.createDataChannel("test");

    channel.onmessage = (event) => {
      logs.push(`📨 サーバからのメッセージ: ${event.data}`);
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const res = await fetch("https://webrtc-answer.rita-base.com/offer", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sdp: offer.sdp, type: offer.type })
    });

    const answer = await res.json();
    await pc.setRemoteDescription(answer);

    let connectionType = '';
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        const cand = event.candidate.candidate;
        if (cand.includes("typ srflx")) connectionType = 'P2P';
        if (cand.includes("typ relay")) connectionType = 'TURN';

        await fetch("https://webrtc-answer.rita-base.com/ice-candidate", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidate: event.candidate,
            pc_id: answer.pc_id
          })
        });
      }
    };

    const waitForOpen = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("DataChannelの接続が10秒以内に完了しませんでした"));
      }, 10000);

      channel.onopen = () => {
        logs.push("✅ WebRTC: DataChannel open!");
        channel.send("hello from client");
        logs.push("candidate-pair: succeeded");
        clearTimeout(timeout);
        resolve();
      };
    });

    try {
      await waitForOpen;
    } catch (e) {
      logs.push("❌ WebRTC接続に失敗しました（DataChannel未確立）");
    }

    if (connectionType) {
      logs.push(`【接続方式】${connectionType === "P2P" ? "P2P通信に成功" : "TURN中継通信に成功"}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1500));
    pc.close();
    return logs;
  };

// -------------------------
// 全体診断フロー（フェーズ1〜3を順に実行）
// - IP取得 / TCP接続確認（フェーズ1）
// - ポート確認API実行（フェーズ2）
// - WebRTC接続確認（フェーズ3）
// -------------------------
  const runDiagnosis = async () => {
    setLoading(true);
    setDiagnosed(false);
    setPhase(1);
    const logs: string[] = [];

    try {
      // フェーズ1：IP取得とサービス接続確認
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        logs.push(`外部IP: ${data.ip}`);
      } catch {
        logs.push("外部IP: 取得失敗");
      }

      try {
        const res = await fetch("/api/fqdncheck");
        const result = await res.text();
        logs.push(result.startsWith("OK")
          ? `サービスへの通信確認: ${result}`
          : `サービスへの通信確認: NG (${result})`);
      } catch (err) {
        logs.push(`サービスへの通信確認: NG (エラー: ${(err as Error).message})`);
      }

      setStatus([...logs]);
      setPhase(2);

      // フェーズ2：ポート確認
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
      } catch (err) {
        logs.push(`ポート確認取得失敗: ${(err as Error).message}`);
        setStatus([...logs]);
        return;
      }

      setStatus([...logs]);
      setPhase(3);

      // フェーズ3：WebRTC診断
      const webrtcLogs = await runWebRTCCheck();
      logs.push(...webrtcLogs);
      setStatus([...logs]);
      setDiagnosed(true);

    } catch (e) {
      console.error(e);
      logs.push("❌ サーバとの接続に失敗しました");
      if (e instanceof Error) logs.push(`詳細: ${e.message}`);
      setStatus([...logs]);
    }
  };

// -------------------------
// チェック結果パネル表示用関数
// - 各項目のログを元に「OK / NG」としてカードを出力
// - NG時はNG理由と補足情報を表示
// -------------------------
  const renderResultCard = (item: (typeof CHECK_ITEMS)[number], idx: number, status: string[]) => {
    const logsForItem = status.filter(log => log.includes(item.keyword));
    let isOK = false;
    if (item.label === 'サービスへの通信確認') {
      isOK = logsForItem.some(log => log.trim().startsWith("サービスへの通信確認: OK"));
    } else if (item.label === 'WebRTC接続成功') {
      isOK = logsForItem.some(log => log.includes("candidate-pair: succeeded") || log.includes("DataChannel open"));
    } else {
      isOK = logsForItem.some(log => log.includes("OK") || log.includes("成功") || log.includes("応答あり"));
    }

    return (
      <div key={idx} className="bg-white text-gray-800 border border-gray-200 shadow-md w-full max-w-[360px] p-4 rounded-xl">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">{item.label}</h3>
          <button className="text-sm text-gray-500 hover:text-gray-800" title="詳細はこちら" onClick={() => setShowDetail(item.label)}>❔</button>
        </div>
        <p className="text-sm text-gray-600 mb-1">{item.description}</p>
        <p className={`text-3xl font-bold text-center ${item.keyword === '外部IP:' ? 'text-emerald-500' : (isOK ? 'text-emerald-500' : 'text-rose-500')}`} >
          {item.keyword === '外部IP:' ? status.find(log => log.startsWith('外部IP:'))?.split(': ')[1] ?? '取得失敗' : (isOK ? 'OK' : 'NG')}
        </p>
        {item.label === 'WebRTC接続成功' && isOK && (
          <p className="text-sm text-green-700 text-center mt-1">
            {status.find(log => log.includes("【接続方式】"))}
          </p>
        )}
        {!isOK && item.ngReason && (
          <div className="text-sm text-black border border-blue-300 bg-blue-50 p-2 rounded mt-2">
            <span className="text-red-500 font-semibold">NG理由:</span> {item.ngReason}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <main className="min-h-screen overflow-y-auto bg-gradient-to-br from-blue-50 to-blue-100 text-gray-900 px-4 sm:px-6 pt-4 sm:pt-8 pb-12 sm:pb-16 text-base sm:text-lg">

        <div className="overflow-hidden w-full">
          <div
            style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
            className="transition-transform duration-300 w-full"
          >
            <div className="max-w-[96%] mx-auto">
              <h1 className="text-3xl sm:text-4xl font-bold text-blue-800 text-center mb-6 tracking-wide">
                キヅクモサービス接続診断ツール
              </h1>

              <p className="text-center text-sm sm:text-base md:text-lg text-gray-700 mb-6 font-semibold leading-relaxed">
                このWeb診断ではお客様ご利用のネットワーク環境がキヅクモカメラと通信できるかを確認します。<br />
                カメラを設置する場所と映像を見る場所の両方で実施してください。<br />
                <span className="text-xs sm:text-sm text-gray-500 font-bold">
                  ※当Web診断はサービスの品質を保証するものではございません。
                </span>
              </p>

              {loading && !diagnosed && (
                <div className="bg-[#1b2a3a] text-blue-100 rounded-xl p-4 sm:p-6 text-sm sm:text-base space-y-4 mb-10 font-semibold">
                  <p>診断は1分ほどかかります。以下のステップで進行中です：</p>
                  <ul className="space-y-1">
                    <li className={`${phase === 1 ? "text-blue-300 animate-pulse" : (phase ?? 0) > 1 ? "text-green-300" : "text-gray-300"}`}>
                      フェーズ 1：キヅクモサービス疎通確認 - {(phase ?? 0) > 1 ? "完了" : phase === 1 ? "実行中" : "未実行"} -
                    </li>
                    <li className={`${phase === 2 ? "text-blue-300 animate-pulse" : (phase ?? 0) > 2 ? "text-green-300" : "text-gray-300"}`}>
                      フェーズ 2：キヅクモサービス利用通信確認 - {(phase ?? 0) > 2 ? "完了" : phase === 2 ? "実行中" : "未実行"} -
                    </li>
                    <li className={`${phase === 3 && !diagnosed ? "text-blue-300 animate-pulse" : diagnosed ? "text-green-300" : "text-gray-300"}`}>
                      フェーズ 3：映像通信確認 - {diagnosed ? "完了" : phase === 3 ? "実行中" : "未実行"} -
                    </li>
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {!loading && !diagnosed && (
                  <button onClick={runDiagnosis} className="w-full sm:w-auto max-w-[200px] h-[44px] px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-full font-semibold shadow text-base sm:text-lg text-center whitespace-nowrap">
                    診断開始
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
                  <>
                    <button onClick={runDiagnosis} className="w-full sm:w-auto max-w-[200px] h-[44px] px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-full font-semibold shadow text-base sm:text-lg text-center whitespace-nowrap">
                      再診断
                    </button>
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
                  </>
                )}
              </div>

              {diagnosed && (
                <div className="grid grid-cols-[repeat(auto-fit,_minmax(280px,_1fr))] gap-4 px-2 sm:px-4 mx-auto max-w-[96%]">
                  {CHECK_ITEMS.map((item, idx) => renderResultCard(item, idx, status))}
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
                          NG理由: {item.ngReason}
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
        </div>

      </main>
    </div>
  );

}