// runWebRTCCheck.ts - WebRTCチェック（camera-statusからoffer取得 → offer送信）

const STUN_TURN_SERVERS = [
  { urls: 'stun:3.80.218.25:3478' },
  {
    urls: 'turn:3.80.218.25:3478?transport=udp',
    username: 'test',
    credential: 'testpass',
  },
];

export default async function runWebRTCCheck(): Promise<string[]> {
  const logs: string[] = [];

  try {
    // CameraからSDP取得
    const res = await fetch('https://webrtc-answer.rita-base.com/camera-status');
    logs.push(`📡 camera-status fetch status: ${res.status}`);
    if (!res.ok) throw new Error('カメラからSDP取得失敗');
    const remote = await res.json();
    logs.push('✅ camera-status取得成功');

    const pc = new RTCPeerConnection({
      iceServers: STUN_TURN_SERVERS,
      iceTransportPolicy: 'all',
      bundlePolicy: 'balanced',
      iceCandidatePoolSize: 1,
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        logs.push(`📨 ICE candidate: ${event.candidate.candidate}`);
      }
    };

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

    await pc.setRemoteDescription(remote);

    // nonce対策：RemoteDescription後に少し待機
    await new Promise((r) => setTimeout(r, 200));
    logs.push('⏱ nonce対策のwait完了');

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // ICE gathering完了まで待機
    while (pc.iceGatheringState !== 'complete') {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    logs.push('✅ setRemoteDescription → createAnswer完了');

    // /offer にPOST送信（応答は使わない）
    await fetch('https://webrtc-answer.rita-base.com/offer', {
      method: 'POST',
      body: JSON.stringify(pc.localDescription),
      headers: { 'Content-Type': 'application/json' },
    });

    logs.push('✅ /offer POST完了');

    // 30秒間様子を見る
    await new Promise((resolve) => setTimeout(resolve, 30000));

    await pc.close();
    logs.push('🛑 PeerConnection closed');
  } catch (err) {
    logs.push(`❌ Error: ${String(err)}`);
  }

  return logs;
}
