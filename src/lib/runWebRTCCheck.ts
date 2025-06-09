const STUN_TURN_SERVERS = [
  { urls: 'stun:3.80.218.25:3478' },
  {
    urls: 'turn:3.80.218.25:3478?transport=udp',
    username: 'test',
    credential: 'testpass',
  },
  {
    urls: 'turn:3.80.218.25:3478?transport=tcp',
    username: 'test',
    credential: 'testpass',
  },
];

export default async function runWebRTCCheck(): Promise<string[]> {
  const logs: string[] = [];

  try {
    // ✅ カメラからSDP取得
    const res = await fetch('https://webrtc-answer.rita-base.com/camera-status');
    if (!res.ok) throw new Error('カメラからSDP取得失敗');
    const remote = await res.json();
    if (!remote.sdp) throw new Error('camera-status応答にsdpが含まれていません');
    logs.push('✅ camera-status取得成功');

    const pc = new RTCPeerConnection({
      iceServers: STUN_TURN_SERVERS,
      iceTransportPolicy: 'all',
      bundlePolicy: 'balanced',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: 0,
    });

    // 🔔 状態ログ
    pc.oniceconnectionstatechange = () => {
      logs.push(`🔄 iceConnectionState: ${pc.iceConnectionState}`);
    };
    pc.onconnectionstatechange = () => {
      logs.push(`🌐 connectionState: ${pc.connectionState}`);
    };
    pc.onsignalingstatechange = () => {
      logs.push(`📶 signalingState: ${pc.signalingState}`);
    };

    // 🔁 ICE candidate 出力
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        logs.push(`📨 ICE candidate: ${event.candidate.candidate}`);
      }
    };

    // ✅ DataChannel作成・監視
    const dc = pc.createDataChannel('check');
    dc.onopen = () => {
      logs.push('✅ DataChannel open');
      dc.send('ping');
      logs.push('📤 sent: ping');
    };
    dc.onmessage = (event) => {
      logs.push(`📥 received: ${event.data}`);
    };
    dc.onclose = () => {
      logs.push('❌ DataChannel closed');
    };

    // SDP設定
    await pc.setRemoteDescription(remote);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // ICE候補のgathering完了まで待機
    while (pc.iceGatheringState !== 'complete') {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    logs.push('✅ setRemoteDescription → createAnswer完了');

    // /offer にPOST送信（応答は使用しない）
    await fetch('https://webrtc-answer.rita-base.com/offer', {
      method: 'POST',
      body: JSON.stringify(pc.localDescription),
      headers: { 'Content-Type': 'application/json' },
    });

    logs.push('✅ /offer POST完了');

    // 🔍 10秒待ってから getStats() 実行
    await new Promise((resolve) => setTimeout(resolve, 10000));
    const stats = await pc.getStats();

    const candidates: Record<string, any> = {};
    const candidatePairs: any[] = [];

    stats.forEach((report) => {
      if (report.type === 'local-candidate' || report.type === 'remote-candidate') {
        candidates[report.id] = report;
      }
      if (report.type === 'candidate-pair') {
        candidatePairs.push(report);
      }
    });

    const succeeded = candidatePairs.filter(p => p.state === 'succeeded');
    if (succeeded.length > 0) {
      succeeded.forEach((pair) => {
        const local = candidates[pair.localCandidateId];
        const remote = candidates[pair.remoteCandidateId];
        logs.push(`🎯 成功 candidate-pair: ${pair.localCandidateId} ⇄ ${pair.remoteCandidateId}`);
        logs.push(`    接続タイプ: ${pair.nominated ? 'nominated' : 'not nominated'}, priority=${pair.priority}`);
        logs.push(`    local(${local?.candidateType}, ${local?.protocol}) ⇄ remote(${remote?.candidateType}, ${remote?.protocol})`);
      });
    } else {
      logs.push('❌ succeededなcandidate-pairが見つかりませんでした');
    }

    // さらに観察用に待機
    await new Promise((resolve) => setTimeout(resolve, 20000));

    await pc.close();
    logs.push('🛑 PeerConnection closed');
  } catch (err) {
    logs.push(`❌ Error: ${String(err)}`);
  }

  return logs;
}
