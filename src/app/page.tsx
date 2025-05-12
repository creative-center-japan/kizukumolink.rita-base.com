//rita-base\src\app\page.tsx

'use client';

import { useState } from 'react';

const CHECK_ITEMS = [
  {
    label: 'NATタイプ',
    description: '利用するNWのNATタイプを確認する',
    keyword: 'NATタイプ:',
    tooltip: 'srflx候補の有無やポート変化から推定されます',
    detail: `ご利用の設備からインターネットへ接続する際にIPアドレスを変更する「NAT」のタイプを確認します。

フルコーンNAT: 外部から内部にアクセスする際にすべてのパケットが許可されます。
アドレス制限コーンNAT: 外部からのIPアドレスが制限されたパケットが許可されます。
【既存の設備へ設定変更が必要】ポート制限コーンNAT: 外部からのIPアドレスとポート番号が制限されたパケットが許可されます。
【既存の設備へ設定変更が必要】対称NAT: 外部から内部へのアクセスは許可されませんが、内部から外部へのアクセスは許可されます。`
  },
  {
    label: '外部IP取得',
    description: 'インターネットへ接続する際のIPを確認',
    keyword: '外部IP:',
    tooltip: 'STUN candidateから抽出されたIPアドレスです',
    detail: '外部との通信に使用されるグローバルIPを表示します。プロキシやNAT越しに通信している場合は異なることがあります。'
  },
  {
    label: 'TCPポート接続',
    description: 'キヅクモサービス（管理用途）で使用するTCPポート（443, 8443, 3478）が接続可能か確認',
    keyword: 'TCP',
    tooltip: 'サーバ側ポートに対する接続の成功/失敗を確認します',
    detail: 'TCP通信が必要なサービス（ライブビュー・管理通信など）に接続可能かを検査します。企業ネットワークでは一部ポートが制限されている場合があります。'
  },
  {
    label: 'UDPポート接続',
    description: 'キヅクモサービス（P2P用途）で使用するUDPポート（63600, 53000など）が接続可能か確認',
    keyword: 'UDP',
    tooltip: 'UDPによる応答の有無で確認します',
    detail: 'UDPは主にP2Pや動画通信で使われます。UDPが閉じている場合、接続が不安定になることがあります。'
  },
  {
    label: 'STUN/TURN応答',
    description: 'STUN/TURNサーバから接続するカメラやPCの情報を取得できたか',
    keyword: 'srflx',
    tooltip: 'typ srflx を含む候補があれば応答ありと判断します',
    detail: 'STUN応答により、外部に見える自分のIPやポート情報を取得します。これが取得できない場合、NATタイプの判定も難しくなります。'
  },
  {
    label: 'WebRTC接続成功',
    description: 'サーバとの通信（P2P or TURN）が確立できたか',
    keyword: 'candidate-pair: succeeded',
    tooltip: 'candidate-pair: succeeded が出たらOKです',
    detail: 'P2P通信が確立されたことを示します。通信相手との双方向通信に成功した場合のみ出力されます。'
  },
  {
    label: 'サービスへの通信確認',
    description: 'キヅクモサービスへの接続（TCP 443）が可能か',
    keyword: 'TCP 443',
    tooltip: 'Alarm.com サーバへ TCP接続できたかを確認します',
    detail: 'カメラサービスのクラウド連携やライブ配信に必要なポートです。443はHTTPSに使われる標準ポートです。'
  }
];

export default function Home() {
  const [status, setStatus] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [diagnosed, setDiagnosed] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);

  const runWebRtcLoopbackCheck = async (): Promise<string[]> => {
    const logs: string[] = [];
    const pc1 = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    const pc2 = new RTCPeerConnection();

    pc1.createDataChannel("test");

    const offer = await pc1.createOffer();
    await pc1.setLocalDescription(offer);
    await pc2.setRemoteDescription(offer);
    const answer = await pc2.createAnswer();
    await pc2.setLocalDescription(answer);
    await pc1.setRemoteDescription(answer);

    pc1.onicecandidate = (e) => { if (e.candidate) pc2.addIceCandidate(e.candidate); };
    pc2.onicecandidate = (e) => { if (e.candidate) pc1.addIceCandidate(e.candidate); };

    return new Promise(resolve => {
      setTimeout(async () => {
        const stats = await pc1.getStats();
        stats.forEach(report => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            logs.push('candidate-pair: succeeded');
          }
          if (report.type === 'local-candidate' && report.candidateType === 'srflx') {
            logs.push(`外部IP: ${report.address}`);
            logs.push(`STUN candidate: candidate:${report.foundation} ${report.component ?? 1} ${report.protocol} ${report.priority} ${report.address} ${report.port} typ ${report.candidateType}`);
          }
          if (report.type === 'local-candidate' && report.candidateType === 'host') {
            logs.push(`STUN candidate: candidate:${report.foundation} ${report.component ?? 1} ${report.protocol} ${report.priority} ${report.address} ${report.port} typ ${report.candidateType}`);
          }
        });
        logs.push(` 実行日時: ${new Date().toLocaleString('ja-JP', { hour12: false })}`);
        resolve(logs);
      }, 3000);
    });
  };

  const runDiagnosis = async () => {
    setLoading(true);
    setDiagnosed(false);
    setStatus(['診断を開始しています...']);

    try {
      const webrtcLogs = await runWebRtcLoopbackCheck();
      const res = await fetch('/api/check');
      const data = await res.json();
      const apiLogs = Array.isArray(data) ? data : [String(data)];

      setTimeout(() => {
        const combined = [...webrtcLogs, ...apiLogs];
        setStatus(combined);
        setLoading(false);
        setDiagnosed(true);
      }, 2000);
    } catch (err) {
      setStatus(prev => [...prev, '接続に失敗しました']);
      setLoading(false);
      setDiagnosed(true);
    }
  };

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

  const renderResultCard = (item, idx) => {
    const logs = status.filter((log) => log.includes(item.keyword));

    let resultContent = 'NG';
    let color = 'text-rose-700';

    if (item.keyword === 'NATタイプ:') {
      const candidates = status.filter((l) => l.startsWith('STUN candidate:'));
      const srflx = candidates.filter(c => c.includes('typ srflx'));
      const ports = srflx.map(c => c.match(/\d+ typ srflx/)?.[0]?.split(' ')[0]);
      const uniquePorts = new Set(ports);

      if (srflx.length >= 2 && uniquePorts.size > 1) {
        resultContent = <>Full Cone NAT<br /><span className="text-xs text-slate-500">(推定)</span></>;
        color = 'text-slate-800';
      } else if (srflx.length >= 2 && uniquePorts.size === 1) {
        resultContent = <>Port-Restricted NAT<br /><span className="text-xs text-slate-500">(推定)</span></>;
        color = 'text-slate-800';
      } else if (srflx.length === 1) {
        resultContent = <>Symmetric NAT<br /><span className="text-xs text-slate-500">(推定)</span></>;
        color = 'text-slate-800';
      }
    } else if (item.keyword === '外部IP:') {
      const log = logs.find((l) => l.startsWith('外部IP:'));
      if (log) {
        const ip = log.replace(/[^\d.]/g, '').trim();
        resultContent = ip;
        color = 'text-slate-800';
      }
    } else if (item.keyword === 'srflx') {
      const found = status.find((l) => l.includes('typ srflx'));
      if (found) {
        resultContent = 'OK';
        color = 'text-emerald-700';
      }
    } else {
      const isOK = logs.some(log => log.includes('成功') || log.includes('応答あり') || log.includes('succeeded'));
      resultContent = isOK ? 'OK' : 'NG';
      color = isOK ? 'text-emerald-700' : 'text-rose-700';
    }

    return (
      <div key={idx} className="bg-white hover:bg-blue-50 border border-blue-200 rounded-xl p-4 shadow space-y-2 transition" title={item.tooltip}>
        <div className="text-sm text-slate-600 font-medium">{item.label}</div>
        <div className="text-xs text-slate-500">{item.description}</div>
        <div className={`text-2xl font-bold text-center ${color}`}>{resultContent}</div>
        <div className="text-right">
          <button onClick={() => setShowDetail(item.label)} className="text-blue-600 text-xs underline hover:text-blue-800">【詳細】</button>
        </div>
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
          <button onClick={runDiagnosis} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium">
            {diagnosed ? '再診断' : '診断開始'}
          </button>
          {diagnosed && (
            <button onClick={downloadResults} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-medium">
              結果をダウンロード
            </button>
          )}
        </div>

        {loading && (
          <div className="bg-white border border-blue-200 rounded-xl p-6 shadow">
            <p className="text-sm text-center text-slate-600 mb-2">診断中...</p>
            <div className="w-full h-3 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 animate-[progress_2s_linear_forwards] w-full" />
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
            <h2 className="text-lg font-semibold text-blue-800">{CHECK_ITEMS.find(i => i.label === showDetail)?.label}</h2>
            <pre className="whitespace-pre-wrap text-slate-700">
              {CHECK_ITEMS.find(i => i.label === showDetail)?.detail}
            </pre>
            <div className="text-right">
              <button onClick={() => setShowDetail(null)} className="mt-2 px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
