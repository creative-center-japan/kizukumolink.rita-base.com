// runWebRTCCheck.ts（繰り返し安全な構成）

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

  // イベントログ
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

  const dc = pc.createDataChannel('check', {
    ordered: true,
    negotiated: true,
    id: 0,
  });

  dc.onopen = () => {
    logs.push('✅ DataChannel open');
    dc.send('ping');
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
  dc.onerror = (e) => logs.push(`⚠ DataChannel error: ${(e as ErrorEvent).message}`);

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const res = await fetch('https://signaling.rita-base.com/offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sdp: offer.sdp,
        type: offer.type,
      }),
    });

    if (!res.ok) {
      throw new Error(`fetchエラー status=${res.status}`);
    }

    const answer = await res.json();
    logs.push('📨 サーバからSDP answerを受信');

    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    logs.push('✅ setRemoteDescription 完了');
  } catch (err: unknown) {
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
