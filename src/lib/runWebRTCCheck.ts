// rita-base/src/lib/runWebRTCCheck.ts

const runWebRTCCheck = async (): Promise<string[]> => {
  const logs: string[] = [];

  const config: RTCConfiguration = {
    iceServers: [
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
    ],
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: 0,
  };

  const pc = new RTCPeerConnection(config);
  logs.push('[設定] WebRTC設定を適用しました');

  // ✅ negotiated: false（自動ネゴシエーション）
  const dc = pc.createDataChannel('check', {
    ordered: true,
  });

  dc.onopen = () => {
    logs.push('✅ DataChannel open');
    dc.send('ping');
    logs.push('📤 送信: ping');
  };
  dc.onmessage = (event) => {
    logs.push(`📨 受信: ${event.data}`);
    logs.push('✅ DataChannel 応答確認完了');
  };
  dc.onerror = (e) => logs.push(`⚠ DataChannel error: ${(e as ErrorEvent).message}`);
  dc.onclose = () => logs.push('❌ DataChannel closed');

  try {
    const res = await fetch('https://webrtc-answer.rita-base.com/camera-status');
    const offer = await res.json();

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    logs.push('✅ setRemoteDescription 完了');

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    logs.push('✅ setLocalDescription 完了');

    let wait = 0;
    while (pc.iceGatheringState !== 'complete' && wait++ < 30) {
      await new Promise(res => setTimeout(res, 100));
    }

  } catch (err) {
    logs.push('❌ 接続失敗');
    if (err instanceof Error) logs.push(`詳細: ${err.message}`);
  }

  return logs;
};

export default runWebRTCCheck;
