// rita-base\src\lib\runWebRTCCheck.ts
// rita-base\src\lib\runWebRTCCheck.ts
// runWebRTCCheck.ts（最新版：camera-statusからSDP取得 → createAnswer + DataChannel通信確認）

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
  logs.push('✅ WebRTC設定を適用');

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

  const dc = pc.createDataChannel('check', { ordered: true });

  dc.onopen = () => {
    logs.push('✅ DataChannel open');
    dc.send('ping');
    logs.push('📤 ping送信');
  };

  dc.onmessage = (event) => {
    logs.push(`📨 DataChannel応答: ${event.data}`);
    setTimeout(() => {
      logs.push('⏱ 60秒経過後にclose');
      if (pc.connectionState !== 'closed') {
        pc.close();
        logs.push('🔚 RTCPeerConnection close完了');
      }
    }, 60000);
  };

  dc.onerror = (e) => {
    logs.push(`⚠ DataChannelエラー: ${(e as ErrorEvent).message}`);
  };

  dc.onclose = () => logs.push('❌ DataChannel closed');

  try {
    logs.push('🌐 SDP取得中...');
    const res = await fetch('https://webrtc-answer.rita-base.com/camera-status');
    const offer = await res.json();
    logs.push('✅ SDP取得成功');

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    logs.push('✅ setRemoteDescription 完了');

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    logs.push('✅ setLocalDescription 完了');
  } catch (err) {
    logs.push('❌ WebRTC初期化失敗');
    if (err instanceof Error) {
      logs.push(`詳細: ${err.message}`);
    }
    pc.close();
    logs.push('🔚 異常終了により close 実施');
  }

  return logs;
};

export default runWebRTCCheck;
