'use client';
import React, { useState, useEffect } from 'react';
// スケール計算関数
function useScaleFactor() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (width < 768) {
        const neededHeight = 720;
        const factor = Math.min(1, height / neededHeight);
        setScale(Number(factor.toFixed(2)));
      } else {
        setScale(1);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);
  return scale;
}

const checkIsOK = (item: (typeof CHECK_ITEMS)[number], status: string[]) => {
  const logsForItem = item.label === 'WebRTC接続成功'
    ? status
    : status.filter(log => log.includes(item.keyword));

  console.log(`🧪 [checkIsOK] 判定対象: ${item.label}`);
  logsForItem.forEach((line, idx) => {
    console.log(`  ${idx + 1}: ${line}`);
  });

  if (item.label === 'ご利用IPアドレス') {
    const ipLog = logsForItem.find(log =>
      log.startsWith("外部IP:") ||
      log.startsWith("🌐 外部IP（補完）:") ||
      log.startsWith("🔸外部IP:")
    );
    const ip = ipLog?.split(/[:：]\s*/)[1]?.trim() ?? "";

    return !!ip &&
      /^[0-9.]+$/.test(ip) &&
      !/^0\.0\.0\.0$/.test(ip) &&
      !/^127\./.test(ip) &&
      !/^10\./.test(ip) &&
      !/^192\.168\./.test(ip) &&
      !/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);
  }

  if (item.label === 'サービスへの通信確認') {
    return logsForItem.some(log => log.includes("サービスへの通信確認: OK"));
  }

  if (item.label === 'WebRTC接続成功') {
    const hasSuccessLog = logsForItem.some(log => log.includes("✅ DataChannel 接続＋応答確認 成功"));
    const hasOKTag = logsForItem.some(log => log.includes("【判定】OK"));
    const hasConnected = logsForItem.some(log => log.includes("全体接続状態: connected"));
    const hasICEConnected = logsForItem.some(log => log.includes("ICE接続状態: connected"));
    const hasCandidatePair = logsForItem.some(log =>
      /candidate-pair state=(succeeded|in-progress), nominated=true/.test(log)
    );

    return hasSuccessLog && hasOKTag && hasConnected && hasICEConnected && hasCandidatePair;
  }

  if (item.label === 'リレーサーバの利用') {
    return logsForItem.some(log =>
      log.includes("✅ relay候補を検出") ||
      log.includes("TURN中継通信に成功")
    );
  }

  return logsForItem.some(log =>
    log.includes("OK") || log.includes("成功") || log.includes("応答あり")
  );
};


const CHECK_ITEMS = [
  {
    label: 'ご利用IPアドレス',
    description: 'インターネットへ接続する際のIPを確認',
    keyword: '外部IP',
    tooltip: 'ブラウザまたは当テスト通信から抽出されたIPアドレスです',
    detail: 'インターネットへ接続する際に使用されるグローバルIPを表示します。',
    ngReason: 'ブラウザまたは当テスト通信からIPアドレスが取得できませんでした。Proxyを利用されている可能性があります。',
    action: 'IPアドレスが取得できなくてもカメラサービスを利用できる可能が場合があります。ただし、ご利用の環境はProxy経由やセキュリティ設定が厳しい環境の可能性があります。その場合、当サービスの利用が行えない場合がございます。事前にネットワーク管理者またはご利用のネットワーク機器のベンダーへ「WebRTCプロトコルを利用したカメラサービスを利用」をご相談させてください。'
  },
  {
    label: 'サービスへの通信確認',
    description: 'キヅクモサービスへの接続（TCP 443）が可能か',
    keyword: 'サービスへの通信確認',
    tooltip: 'キヅクモサービス サーバへ TCP接続できたかを確認します',
    detail: 'キヅクモカメラサービスへ接続しカメラ設定・映像配信確認時に利用するドメインとポートが利用できるか確認します。TCP/443はHTTPSに使われる標準ポートです。',
    ngReason: 'サービス提供元（Alarm.com）へTCP接続できませんでした。ファイアウォールやセキュリティ機器でブロックされている可能性があります。',
    action: 'この通信ができないとサービスを利用できません。ネットワーク管理者またはご利用のネットワーク機器のベンダーへ「キヅクモサービスのドメインに対するTCP 443番ポートの許可」をご相談ください。キヅクモサービスのドメインに関しては弊社コンタクトよりお問い合わせください。'
  },
  {
    label: '通信ポート確認',
    description: 'キヅクモサービス（管理用途やP2P用途）で使用するポートが接続可能か確認',
    keyword: 'ポート確認:',
    tooltip: 'サーバ側ポートに対する接続の成功/失敗を確認します',
    detail: 'ライブビュー・管理通信・動画配信にて利用するポートが接続可能かを検査します。企業ネットワークでは一部ポートが制限されている場合があります。',
    ngReason: '必要なポートの一部が閉じています。社内のセキュリティポリシーにより制限されている可能性があります。',
    action: '一部ポートが閉じていると映像配信や接続に支障が出る可能性があります。ネットワーク管理者またはご利用のネットワーク機器のベンダーへ「キヅクモサービスで利用するポートの許可」をご相談ください。キヅクモサービスのポートに関しては弊社コンタクトよりお問い合わせください。'
  },
  {
    label: 'WebRTC接続成功',
    description: 'サーバとの通信（P2P or TURN）が確立できたか',
    keyword: '🔸 WebRTCログ',
    tooltip: 'candidate-pair: succeeded が出たらOKです',
    detail: 'カメラとブラウザなどを利用したカメラ閲覧が直接通信（P2P接続）が確立されたことを示します。通信相手との双方向通信に成功した場合のみ出力されます。',
    ngReason: '通信の確立に必要な応答が得られず、カメラ通信を開始するができませんでした。ネットワーク構成やブラウザの制限が原因の可能性があります。',
    action: 'WebRTC未接続の場合、一部機能が制限される可能性があります。ブラウザが最新か、ネットワーク管理者またはご利用のネットワーク機器のベンダーへ「WebRTCを利用したP2P接続の利用」をご相談ください。ご利用のVPN/Proxy/Firewallの影響がないかご確認ください。'
  },
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
    let dataChannelOpened = false;
    let pingConfirmed = false;
    let connectionType: "P2P" | "TURN" | "" = "";
    let candidatePairSucceeded = false;

    // --- ICE設定：デバイスごとに構成を分岐
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const config: RTCConfiguration = isMobile ? {
      iceServers: [
        { urls: ['turn:3.80.218.25:3478?transport=tcp'], username: 'test', credential: 'testpass' }
      ],
      iceTransportPolicy: 'relay',
      bundlePolicy: 'max-bundle',
      iceCandidatePoolSize: 0
    } : {
      iceServers: [
        { urls: 'stun:3.80.218.25:3478' },
        { urls: ['turn:3.80.218.25:3478?transport=udp'], username: 'test', credential: 'testpass' },
        { urls: ['turn:3.80.218.25:3478?transport=tcp'], username: 'test', credential: 'testpass' }
      ],
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      iceCandidatePoolSize: 0
    };

    logs.push(`[設定] iceServers: ${JSON.stringify(config.iceServers)}`);

    const pc = new RTCPeerConnection(config);
    const dc = pc.createDataChannel("check");
    logs.push("🔧 DataChannel 作成済み");

    dc.onopen = () => {
      logs.push("✅ WebRTC: DataChannel open!");
      dc.send("ping");
      logs.push("📤 ping を送信しました");
      dataChannelOpened = true;
    };

    dc.onmessage = (event) => {
      logs.push(`📨 受信メッセージ: ${event.data}`);
      if (event.data === "pong") {
        pingConfirmed = true;
        logs.push("✅ pong を受信 → DataChannel 応答OK");
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        logs.push(`ICE候補: ${e.candidate.candidate}`);
        if (e.candidate.candidate.includes("typ relay")) {
          logs.push("✅ relay候補を検出");
        }
      } else {
        logs.push("ICE候補: 収集完了");
      }
    };

    pc.oniceconnectionstatechange = () => {
      logs.push(`ICE接続状態: ${pc.iceConnectionState}`);
    };

    pc.onconnectionstatechange = () => {
      logs.push(`全体接続状態: ${pc.connectionState}`);
    };

    // SDP offer 作成＆送信
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    logs.push("📝 SDP offer 生成・セット完了");

    const res = await fetch("https://webrtc-answer.rita-base.com/offer", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sdp: offer.sdp, type: offer.type })
    });
    const answer = await res.json();
    await pc.setRemoteDescription(answer);
    logs.push("📥 SDP answer 受信・セット完了");

    // ICE candidate gathering 完了を通知（ICE-lite対応）
    await pc.addIceCandidate(null);
    logs.push("📤 end-of-candidates を送信完了");

    // 接続確立まで最大20秒待機
    for (let i = 0; i < 20; i++) {
      if (dataChannelOpened && pingConfirmed) break;
      await new Promise(r => setTimeout(r, 1000));
    }

    const stats = await pc.getStats();

    stats.forEach(report => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.nominated) {
        const local = report.localCandidateId;
        const localCand = stats.get(local);
        if (localCand?.candidateType === 'relay') {

          logs.push("✅ TURN中継通信に成功（candidate-pair: succeeded, relay）");
        } else {
          connectionType = "P2P";
          logs.push("✅ P2P接続に成功（candidate-pair: succeeded, host/srflx）");
        }
        candidatePairSucceeded = true;
      }
    });

    if (!candidatePairSucceeded) {
      logs.push("❌ 接続候補ペアが確立しませんでした（succeeded候補なし）");
    }

    if (dataChannelOpened && pingConfirmed) {
      logs.push("✅ DataChannel 接続＋応答確認 成功");
      logs.push("【判定】OK");
    } else {
      logs.push("❌ DataChannel 開通または応答失敗");
      logs.push("【判定】NG");
    }

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
      let ip = "取得失敗";
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        ip = data.ip;
      } catch {
        ip = "取得失敗";
      }

      // FQDNチェック
      let fqdnResult = "NG";
      try {
        const res = await fetch("/api/fqdncheck");
        const result = await res.text();
        fqdnResult = result.startsWith("OK")
          ? `OK (Alarm.com 接続成功 - status: 200)`
          : `NG (${result})`;
      } catch (err) {
        fqdnResult = `NG (エラー: ${(err as Error).message})`;
      }

      // ▼ ログ出力（フェーズ1）
      logs.push(`📅 実行日時: ${new Date().toLocaleString("ja-JP", { hour12: false })}`);
      logs.push(`🔸外部IP: ${ip}`);
      logs.push(`🔸サービスへの通信確認: ${fqdnResult}`);

      setStatus([...logs]);
      setPhase(2);

      // フェーズ2：ポート確認
      try {
        const res = await fetch("https://check-api.rita-base.com/check-json");
        const data = await res.json();

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
      logs.push("🔸 WebRTCログ");
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

  // テキストレポート出力用関数
  function generateReportText(logs: string[]): string {
    const lines: string[] = [];

    // ヘッダー情報（IP, 日時など）
    const header = logs.filter(log =>
      log.startsWith("📅") || log.startsWith("🔸外部IP:") || log.startsWith("🔸サービスへの通信確認")
    );
    lines.push(...header);

    // TCP/UDPポート
    const tcp = logs.filter(log => log.startsWith("ポート確認: TCP"));
    const udp = logs.filter(log => log.startsWith("ポート確認: UDP"));
    if (tcp.length || udp.length) {
      lines.push("🔸 TCPポート確認:");
      lines.push(...tcp);
      lines.push("🔸 UDPポート確認:");
      lines.push(...udp);
    }

    // WebRTCログ
    const webrtc = logs.filter(log =>
      log.startsWith("[設定]") || log.startsWith("🔧") || log.startsWith("📝") ||
      log.startsWith("📥") || log.startsWith("ICE") || log.startsWith("✅") ||
      log.startsWith("⚠️") || log.startsWith("❌") || log.startsWith("📤") ||
      log.startsWith("candidate-pair") || log.startsWith("📊") || log.startsWith("全体接続状態")
    );
    lines.push("🔸 WebRTCログ");
    lines.push(...webrtc);

    return lines.join('\n');
  }

  // -------------------------
  // チェック結果パネル表示用関数
  // - 各項目のログを元に「OK / NG」としてカードを出力
  // - NG時はNG理由と補足情報を表示
  // -------------------------
  const renderResultCard = (
    item: (typeof CHECK_ITEMS)[number],
    idx: number,
    status: string[]
  ) => {
    const logsForItem = status.filter(log => log.includes(item.keyword));
    const isOK = checkIsOK(item, logsForItem);

    return (
      <div
        key={idx}
        className="relative bg-white text-gray-800 border border-gray-200 shadow-md w-full max-w-[360px] p-4 rounded-xl"
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">{item.label}</h3>
          <button
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold hover:bg-blue-200"
            title={item.tooltip}
            onClick={() => setShowDetail(item.label)}
          >
            ？
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-1">{item.description}</p>

        <p className="text-3xl font-bold text-center">
          {(() => {
            if (item.label === 'ご利用IPアドレス') {
              const ipLog = status.find(log =>
                log.startsWith("外部IP:") ||
                log.startsWith("🌐 外部IP（補完）:") ||
                log.startsWith("🔸外部IP:")
              );
              const ipAddress = ipLog?.split(/[:：]\s*/)[1]?.trim() ?? '';
              return (
                <span className={isOK ? 'text-emerald-500' : 'text-rose-500'}>
                  {ipAddress || '取得失敗'}
                </span>
              );
            } else {
              return (
                <span className={isOK ? 'text-emerald-500' : 'text-rose-500'}>
                  {isOK ? 'OK' : 'NG'}
                </span>
              );
            }
          })()}
        </p>

        {item.label === 'WebRTC接続成功' && (
          <p className="text-sm text-blue-700 text-center mt-1">
            {status.find(log => log.includes("【接続方式】")) || "【接続方式】不明"}
          </p>
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

              {/* ▼ 診断結果タイル（診断完了後のみ表示） */}
              {diagnosed && (
                <div className="grid grid-cols-[repeat(auto-fit,_minmax(280px,_1fr))] gap-4 px-2 sm:px-4 mx-auto max-w-[96%] mb-4">
                  {CHECK_ITEMS.map((item, idx) => renderResultCard(item, idx, status))}
                </div>
              )}

              {/* ▼ ボタン表示エリア（常時表示） */}
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {!loading && !diagnosed && (
                  <button
                    onClick={runDiagnosis}
                    className="w-full sm:w-auto max-w-[200px] h-[44px] px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-full font-semibold shadow text-base sm:text-lg text-center whitespace-nowrap"
                  >
                    診断開始
                  </button>
                )}

                {loading && !diagnosed && (
                  <button
                    onClick={() => {
                      setLoading(false);
                      setStatus([]);
                    }}
                    className="w-full sm:w-auto max-w-[200px] h-[44px] px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-full font-semibold shadow text-base sm:text-lg text-center whitespace-nowrap"
                  >
                    キャンセル
                  </button>
                )}
              </div>

              {diagnosed && (
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  <button
                    onClick={runDiagnosis}
                    className="w-full sm:w-auto max-w-[200px] h-[44px] px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-full font-semibold shadow text-base sm:text-lg text-center whitespace-nowrap"
                  >
                    再診断
                  </button>
                  <button
                    onClick={() => {
                      const text = generateReportText(status);
                      const blob = new Blob([text], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `ritabase_check_${new Date().toISOString().slice(0, 10)}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full sm:w-auto max-w-[200px] h-[44px] px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-full font-semibold shadow text-base sm:text-lg text-center whitespace-nowrap"
                  >
                    結果をダウンロード
                  </button>
                </div>
              )}

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

              {/* NG項目の総括 */}
              {diagnosed && (
                <div className="border border-blue-300 bg-blue-100 rounded-xl px-4 py-6 mt-10 space-y-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">NG項目の要約</h2>
                  {CHECK_ITEMS.map((item, idx) => {
                    const logsForItem = status.filter(log => log.includes(item.keyword));
                    const isOK = checkIsOK(item, logsForItem);
                    if (isOK) return null;

                    if (item.ngReason) {
                      return (
                        <div key={idx} className="bg-white border border-blue-300 p-4 rounded shadow">
                          <p className="font-bold text-gray-800 mb-2">【NG項目】{item.label}</p>
                          <p><span className="font-semibold text-red-600">NG理由:</span> {item.ngReason}</p>
                          {item.action && (
                            <p className="mt-2"><span className="font-semibold text-blue-600">今後の対応:</span> {item.action}</p>
                          )}
                        </div>
                      );
                    }

                    return null;
                  })}
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

      </main >
    </div >
  );

}