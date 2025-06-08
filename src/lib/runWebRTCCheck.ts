// rita-base\src\lib\runWebRTCCheck.ts
// runWebRTCCheck.ts（修正版：camera-statusからSDP取得 → createAnswer対応＋keepalive対応）

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

  pc.addEventListener('icecandidate', (e) => {
    logs.push('[ICE] candidate: ' + (e.candidate?.candidate ?? '(収集完了)'));
  });

  pc.addEventListener('iceconnectionstatechange', () => {
    logs.push('[ICE] connection state: ' + pc.iceConnectionState);
  });

  pc.addEventListener('connectionstatechange', () => {
    logs.push('[WebRTC] connection state: ' + pc.connectionState);
  });

  pc.addEventListener('signalingstatechange', () => {
    logs.push('[WebRTC] signaling state: ' + pc.signalingState);
  });

  pc.addEventListener('icegatheringstatechange', () => {
    logs.push('[ICE] gathering state: ' + pc.iceGatheringState);
  });

  // ✅ GCP側の構成に合わせて negotiated: true, id: 0
  const dc = pc.createDataChannel('keepalive', {
    negotiated: true,
    id: 0,
  });

  dc.onopen = () => {
    logs.push('✅ DataChannel open');
    dc.send('ping'); // GCP側が "📨 received: ping" をログするはず
    logs.push('📤 送信: ping');
  };

  dc.onmessage = (event) => {
    logs.push(`📨 受信: ${event.data}`);
    logs.push('✅ DataChannel 応答確認完了');
    setTimeout(() => {
      logs.push('⏱ DataChannel を60秒維持後に close 実行');
      if (pc.connectionState !== 'closed') {
        pc.close();
        logs.push('✅ RTCPeerConnection を close しました');
      }
    }, 60000);
  };

  dc.onclose = () => logs.push('❌ DataChannel closed');
  dc.onerror = (e) =>
    logs.push(`⚠ DataChannel error: ${(e as ErrorEvent).message}`);

  try {
    const res = await fetch('https://webrtc-answer.rita-base.com/camera-status');
    const offer = await res.json();

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    logs.push('✅ setRemoteDescription 完了');

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    logs.push('✅ setLocalDescription 完了');
  } catch (err) {
    logs.push('❌ WebRTC接続に失敗しました');
    if (err instanceof Error) {
      logs.push(`詳細: ${err.message}`);
    }
    pc.close();
    logs.push('🔚 異常終了のため RTCPeerConnection を明示的に close');
  }

  return logs;
};

export default runWebRTCCheck;
