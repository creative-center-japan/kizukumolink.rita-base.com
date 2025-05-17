//rita-base\src\app\page.tsx

'use client';

import React, { useState } from 'react';

interface CheckItem {
  label: string;
  description: string;
  keyword: string;
  tooltip: string;
  detail: string;
  ngReason: string;
}

type RTCIceCandidateStats = {
  id: string;
  timestamp: number;
  type: 'local-candidate' | 'remote-candidate';
  candidateType: 'host' | 'srflx' | 'prflx' | 'relay';
  protocol: string;
  address?: string;
  ip?: string;
  port: number;
  foundation?: string;
  priority?: number;
  url?: string;
  relayProtocol?: string;
};

type RTCIceCandidatePairStats = {
  id: string;
  timestamp: number;
  type: 'candidate-pair';
  localCandidateId: string;
  remoteCandidateId: string;
  state: 'frozen' | 'waiting' | 'in-progress' | 'failed' | 'succeeded' | 'cancelled';
  nominated?: boolean;
  writable?: boolean;
  priority?: number;
  totalRoundTripTime?: number;
  currentRoundTripTime?: number;
  availableOutgoingBitrate?: number;
  availableIncomingBitrate?: number;
};

export default function Home() {
  const [status, setStatus] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [diagnosed, setDiagnosed] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);

  const CHECK_ITEMS: CheckItem[] = [
    {
      label: 'NATタイプ',
      description: '利用するNWのNATタイプを確認する',
      keyword: 'NATタイプ:',
      tooltip: 'srflx候補の有無やポート変化から推定されます',
      detail: `ご利用の設備からインターネットへ接続する際にIPアドレスを変更する「NAT」のタイプを確認します。

フルコーンNAT: 外部から内部にアクセスする際にすべてのパケットが許可されます。
アドレス制限コーンNAT: 外部からのIPアドレスが制限されたパケットが許可されます。
【既存の設備へ設定変更が必要】ポート制限コーンNAT: 外部からのIPアドレスとポート番号が制限されたパケットが許可されます。
【既存の設備へ設定変更が必要】対称NAT: 外部から内部へのアクセスは許可されませんが、内部から外部へのアクセスは許可されます。`,
      ngReason: 'STUN応答からNATタイプが判定できませんでした'
    },

    {
      label: 'TURN応答',
      description: 'TURNサーバを経由した通信ができたか',
      keyword: 'typ relay',
      tooltip: 'typ relay を含む候補があれば中継成功と判断します',
      detail: 'STUN/TURN応答で relay タイプの候補があれば、P2Pが通らなくても通信可能な環境です。',
      ngReason: 'typ relay の候補が1つも見つかりませんでした'
    },

    {
      label: '外部IP取得',
      description: 'インターネットへ接続する際のIPを確認',
      keyword: '外部IP:',
      tooltip: 'STUN candidateから抽出されたIPアドレスです',
      detail: '外部との通信に使用されるグローバルIPを表示します。プロキシやNAT越しに通信している場合は異なることがあります。',
      ngReason: 'STUN候補からIPアドレスが取得できませんでした'
    },
    {
      label: 'TCPポート接続',
      description: 'キヅクモサービス（管理用途）で使用するTCPポート（443, 8443, 3478）が接続可能か確認',
      keyword: 'TCP',
      tooltip: 'サーバ側ポートに対する接続の成功/失敗を確認します',
      detail: 'TCP通信が必要なサービス（ライブビュー・管理通信など）に接続可能かを検査します。企業ネットワークでは一部ポートが制限されている場合があります。',
      ngReason: 'サーバー側のポート接続に失敗しました'
    },
    {
      label: 'UDPポート接続',
      description: 'キヅクモサービス（P2P用途）で使用するUDPポート（63600, 53000など）が接続可能か確認',
      keyword: 'UDP',
      tooltip: 'UDPによる応答の有無で確認します',
      detail: 'UDPは主にP2Pや動画通信で使われます。UDPが閉じている場合、接続が不安定になることがあります。',
      ngReason: 'UDPポートの応答がすべて失敗しました'
    },
    {
      label: 'STUN/TURN応答',
      description: 'STUN/TURNサーバから接続するカメラやPCの情報を取得できたか',
      keyword: 'srflx',
      tooltip: 'typ srflx を含む候補があれば応答ありと判断します',
      detail: 'STUN応答により、外部に見える自分のIPやポート情報を取得します。これが取得できない場合、NATタイプの判定も難しくなります。',
      ngReason: 'typ srflx の候補が1つも見つかりませんでした'
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
      label: 'サービスへの通信確認',
      description: 'キヅクモサービスへの接続（TCP 443）が可能か',
      keyword: 'TCP 443',
      tooltip: 'Alarm.com サーバへ TCP接続できたかを確認します',
      detail: 'カメラサービスのクラウド連携やライブ配信に必要なポートです。443はHTTPSに使われる標準ポートです。',
      ngReason: 'Alarm.com への TCP 接続ができませんでした'
    }
  ];


  const runWebRtcRemoteCheck = async (): Promise<string[]> => {
  const logs: string[] = [];

  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:3.80.218.25:3478' },
      { urls: 'turn:3.80.218.25:3478', username: 'test', credential: 'testpass' }
    ],
    iceTransportPolicy: "all"
  });

  pc.createDataChannel("test");

  logs.push("🛰️ WebRTC診断開始: GCPサーバへ接続を試行中");

  pc.oniceconnectionstatechange = () => {
    logs.push(`ICE接続状態: ${pc.iceConnectionState}`);
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      logs.push(`ICE候補発見: ${event.candidate.candidate}`);
    } else {
      logs.push('ICE候補の収集完了');
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const gcpUrl = "https://webrtc-answer.rita-base.com/offer";
  logs.push("🛰️ GCPにoffer送信中...");

  const res = await fetch(gcpUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sdp: offer.sdp,
      type: offer.type
    })
  });

  const answer = await res.json();
  logs.push("🎯 GCPからanswerを受信、セット完了");

  await pc.setRemoteDescription(new RTCSessionDescription(answer));

  let connected = false;

  await new Promise(resolve => {
    pc.oniceconnectionstatechange = () => {
      logs.push(`ICE接続状態: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        connected = true;
        logs.push("✅ WebRTC接続成功（GCP対向）");
        pc.close();
        resolve(true);
      }
      if (pc.iceConnectionState === "failed") {
        logs.push("❌ WebRTC接続失敗（GCP対向）");
        pc.close();
        resolve(false);
      }
    };
    setTimeout(() => {
      if (!connected) {
        logs.push("❌ WebRTC接続タイムアウト（GCP対向）");
        pc.close();
        resolve(false);
      }
    }, 10000);
  });

  // 🔴 以下のコードを関数の中に戻す
  const extra = await analyzeWebRTCStats(pc);
  logs.push(...extra);

  return logs;
};

const runDiagnosis = async () => {
  setLoading(true);
  setDiagnosed(false);
  setStatus(['診断を開始しています...']);

  try {
    const mergedLogs: string[] = [];

    // 🌐 ブラウザの外部IPを最初に取得してログに追加
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      mergedLogs.push(`🌐 外部IP（ブラウザから取得）: ${data.ip}`);
    } catch {
      mergedLogs.push(`🌐 外部IP（ブラウザから取得）: 取得失敗`);
    }

    for (let i = 1; i <= 3; i++) {
      mergedLogs.push(`🔄 診断 ${i} 回目 開始`);
      const logs = await runWebRtcRemoteCheck();
      mergedLogs.push(...logs);
      mergedLogs.push(`📎 診断 ${i} 回目 終了`);
      await new Promise((res) => setTimeout(res, 3000));
    }

    // GCPのTURNログ照合を実施
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipRes.json();
      const clientIp = ipData.ip;

      const logRes = await fetch(`https://turn-session.rita-base.com/api/sessions?client_ip=${clientIp}`);
      const logData = await logRes.json();

      if (logData.count > 0) {
        mergedLogs.push(`🧾 サーバーログに relay セッションあり (${logData.count}件)`);
      } else {
        mergedLogs.push(`🧾 サーバーログに relay セッションなし`);
      }

    } catch {
      mergedLogs.push(`⚠️ サーバーログ照合に失敗しました`);
    }

    setStatus(mergedLogs);
    setLoading(false);
    setDiagnosed(true);

  } catch {
    setStatus(prev => [...prev, '接続に失敗しました']);
    setLoading(false);
    setDiagnosed(true);
  }
};

async function analyzeWebRTCStats(pc: RTCPeerConnection): Promise<string[]> {
  const logs: string[] = [];
  const stats = await pc.getStats();

  let selectedPairId = '';
  const candidates: Record<string, RTCIceCandidateStats> = {};

  stats.forEach(report => {
    if (report.type === 'candidate-pair' && report.nominated && report.state === 'succeeded') {
      selectedPairId = report.id;
      logs.push('✅ 実際に使用された candidate-pair が見つかりました');
    }
    if (report.type === 'local-candidate' || report.type === 'remote-candidate') {
      candidates[report.id] = report as RTCIceCandidateStats;
    }
  });

  if (!selectedPairId) {
    logs.push('❌ 使用された candidate-pair が見つかりませんでした');
    return logs;
  }

  const selectedPair = stats.get(selectedPairId) as RTCIceCandidatePairStats;

  if (!selectedPair) {
    logs.push('⚠️ 使用された candidate-pair の詳細が取得できませんでした');
    return logs;
  }

  const local = candidates[selectedPair.localCandidateId];
  const remote = candidates[selectedPair.remoteCandidateId];

  if (local) {
    logs.push(`🌐 Local: ${local.address}:${local.port} typ ${local.candidateType}`);
  }
  if (remote) {
    logs.push(`🌍 Remote: ${remote.address}:${remote.port} typ ${remote.candidateType}`);
  }

  switch (local?.candidateType) {
    case 'relay':
      logs.push('📡 接続は TURN中継 によって確立されました（※P2P経路は使われていません）');
      break;
    case 'srflx':
      logs.push('📡 接続は P2P（STUN経由） によって確立されました');
      break;
    case 'host':
      logs.push('📡 接続は ローカルhost候補 によって確立されました（⚠️外部P2Pではない可能性あり）');
      break;
    default:
      logs.push('📡 接続経路の判定ができませんでした');
      break;
  }

  return logs;
}

const downloadResults = () => {
  const timestamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([status.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ritabase_check_${timestamp}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const renderResultCard = (item: (typeof CHECK_ITEMS)[number], idx: number) => {
  const logs = status.filter((log) => log.includes(item.keyword));
  let resultContent: React.ReactNode = 'NG';
  let color = 'text-rose-700';

  if (item.keyword === 'NATタイプ:') {
    const srflxCandidates = status.filter((l) => l.includes('typ srflx'));
    const ips = srflxCandidates.map(c => c.match(/(\d+\.\d+\.\d+\.\d+)/)?.[1]).filter(Boolean);
    const ports = srflxCandidates.map(c => c.match(/(\d+)\s+typ\s+srflx/)?.[1]).filter(Boolean);
    const uniqueIps = new Set(ips);
    const uniquePorts = new Set(ports);

    if (srflxCandidates.length >= 2 && uniquePorts.size === 1) {
      resultContent = <>Full Cone NAT<br /><span className="text-xs text-slate-500">(推定)</span></>;
      color = 'text-emerald-700';
    } else if (srflxCandidates.length >= 2 && uniquePorts.size > 1) {
      resultContent = <>Symmetric NAT<br /><span className="text-xs text-rose-600">【既存設備の設定変更が必要】</span></>;
      color = 'text-rose-700';
    } else if (srflxCandidates.length >= 1 && uniqueIps.size === 1) {
      resultContent = <>Full Cone NAT<br /><span className="text-xs text-slate-500">（自動判定）</span></>;
      color = 'text-emerald-700';
    } else if (srflxCandidates.length >= 1) {
      resultContent = <>Symmetric NAT<br /><span className="text-xs text-rose-600">【既存設備の設定変更が必要】</span></>;
      color = 'text-rose-700';
    } else {
      resultContent = <>NAT判定不可<br /><span className="text-xs text-slate-500">（srflx候補なし）</span></>;
      color = 'text-slate-400';
    }

  } else if (item.keyword === '外部IP:') {
    const stunLog = status.find((l) => /^外部IP: \d+\.\d+\.\d+\.\d+$/.test(l));
    const browserLog = status.find((l) => /^🌐 外部IP（ブラウザから取得）:/.test(l));
    const ipMatch = stunLog?.match(/(\d+\.\d+\.\d+\.\d+)/) || browserLog?.match(/(\d+\.\d+\.\d+\.\d+)/);

    if (ipMatch) {
      resultContent = (
        <>
          {ipMatch[1]}
          {browserLog && !stunLog && (
            <span className="text-xs text-slate-500 block">(ブラウザから取得)</span>
          )}
        </>
      );
      color = 'text-slate-800';
    } else {
      resultContent = 'N/A';
      color = 'text-slate-400';
    }

  } else if (item.keyword === 'srflx') {
    const found = status.find((l) => l.includes('typ srflx'));
    if (found) {
      resultContent = 'OK';
      color = 'text-emerald-700';
    } else {
      resultContent = 'NG';
      color = 'text-rose-700';
    }

  } else if (item.keyword === 'typ relay') {
    const found = status.find((l) => l.includes('typ relay'));
    if (found) {
      resultContent = 'OK';
      color = 'text-emerald-700';
    } else {
      resultContent = 'NG';
      color = 'text-rose-700';
    }

  } else {
    const isOK = logs.some(log => log.includes('成功') || log.includes('応答あり') || log.includes('succeeded'));
    resultContent = isOK ? 'OK' : 'NG';
    color = isOK ? 'text-emerald-700' : 'text-rose-700';
  }

  return (
    <div key={idx} className="bg-white hover:bg-blue-50 border border-blue-200 rounded-xl p-4 shadow space-y-2 transition" title={item.tooltip}>
      <div className="text-sm text-slate-600 font-medium flex justify-between items-center">
        {item.label}
        <button
          onClick={() => setShowDetail(item.label)}
          className="ml-2 cursor-pointer hover:text-blue-600"
          title="詳細はこちら"
        >
          <span role="img" aria-label="詳細">❔</span>
        </button>
      </div>
      <div className="text-xs text-slate-500">{item.description}</div>
      <div className={`text-2xl font-bold text-center ${color}`}>{resultContent}</div>
    </div>
  );
};

return (
  <main className="min-h-screen bg-blue-50 text-slate-800 flex flex-col">
    <div className="max-w-5xl w-full mx-auto px-6 py-10 space-y-8 flex-grow">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-blue-900">キヅクモ接続診断</h1>
        <p className="text-sm text-slate-700 mt-2">
          本ツールでは、ネットワーク環境がキヅクモカメラと正しく通信できるかを診断します。<br />
          カメラを設置する場所で利用している端末と映像を閲覧する端末の両方での接続診断を行うことで、事前に問題を把握することができます。
        </p>
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={runDiagnosis}
          className={`px-6 py-3 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            } text-white rounded-full font-medium`}
          disabled={loading}
        >
          {loading ? '診断中...' : diagnosed ? '再診断' : '診断開始'}
        </button>
        {diagnosed && (
          <button
            onClick={downloadResults}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-medium"
          >
            結果をダウンロード
          </button>
        )}
      </div>

      {loading && (
        <div className="bg-white border border-blue-200 rounded-xl p-6 shadow">
          <p className="text-sm text-center text-slate-600 mb-2">診断中...</p>
          <div className="w-full h-3 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-blue-500 animate-pulse rounded-full" />
          </div>
        </div>
      )}

      {diagnosed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHECK_ITEMS.map((item, idx) => renderResultCard(item, idx))}
        </div>
      )}
    </div>

    {showDetail && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-md max-w-md shadow-md text-sm space-y-3">
          <h2 className="text-lg font-semibold text-blue-800">
            {CHECK_ITEMS.find(i => i.label === showDetail)?.label}
          </h2>

          <pre className="whitespace-pre-wrap text-slate-700">
            {CHECK_ITEMS.find(i => i.label === showDetail)?.detail}

            {(() => {
              const detail = CHECK_ITEMS.find(i => i.label === showDetail);
              const isOK = (() => {
                switch (detail?.keyword) {
                  case '外部IP:':
                    return status.some(l => /^外部IP: \d+\.\d+\.\d+\.\d+$/.test(l));
                  case 'candidate-pair: succeeded':
                    return status.some(l => l.includes('candidate-pair: succeeded'));
                  case 'typ relay':
                    return status.some(l => l.includes('typ relay'));
                  case 'srflx':
                    return status.some(l => l.includes('typ srflx'));
                  default:
                    return status.some(log => log.includes('成功') || log.includes('応答あり') || log.includes('succeeded'));
                }
              })();

              if (!isOK && detail?.ngReason) {
                return `\n\n❗NG理由: ${detail.ngReason}`;
              }
              return '';
            })()}
          </pre>

          <div className="text-right">
            <button
              onClick={() => setShowDetail(null)}
              className="mt-2 px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    )}
  </main>
);
} 
