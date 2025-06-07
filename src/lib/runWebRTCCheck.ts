// -------------------------
// runWebRTCCheck.ts
// - WebRTC診断（DataChannelの接続確認）
// - UDP TURN接続を基本とし、relay候補の接続可否を判定
// - DataChannel は negotiated: true / id: 0 を使用（server/client一致）
// -------------------------

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

  let idleTimer: NodeJS.Timeout | null = null;
  const IDLE_TIMEOUT = 60 * 1000; // 1分

  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      logs.push('⏱ アイドル1分経過 → DataChannel close() 実行');
      pc.close();
    }, IDLE_TIMEOUT);
  };

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
    resetIdleTimer();
    dc.send('ping');
    logs.push('📤 sent: ping');
  };

  dc.onmessage = (event) => {
    logs.push(`📨 受信メッセージ: ${event.data}`);
    resetIdleTimer();
  };

  dc.onclose = () => logs.push('❌ DataChannel closed');
  dc.onerror = (e) => logs.push(`⚠ DataChannel error: ${(e as ErrorEvent).message}`);

  const offer = await pc.createOffer({
    offerToReceiveAudio: false,
    offerToReceiveVideo: false,
    iceRestart: true,
  });

  await pc.setLocalDescription(offer);

  try {
    const res = await fetch('https://signaling.rita-base.com/offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sdp: pc.localDescription!.sdp,
        type: pc.localDescription!.type,
      }),
    });

    if (!res.ok) {
      throw new Error(`fetchエラー status=${res.status}`);
    }

    const answer = await res.json();
    logs.push('📨 サーバからSDP answerを受信');

    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    logs.push('✅ setRemoteDescription 完了');

    // ICE candidate-pair の状態を追跡
    const interval = setInterval(async () => {
      try {
        const stats = await pc.getStats();
        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.nominated) {
            logs.push(`🛰 relay経由成功: ${report.localCandidateId} -> ${report.remoteCandidateId}`);
          }
        });
      } catch {
        // 無視
      }
    }, 2000);

    // 明示的に10秒保持してから終了
    await new Promise((res) => setTimeout(res, 10000));
    logs.push('⏱ 接続を10秒保持後にclose');

    clearInterval(interval);
    pc.close();
  } catch (err: unknown) {
    logs.push('❌ WebRTC接続に失敗しました');
    if (err instanceof Error) {
      logs.push(`詳細: ${err.message}`);
    }
  }

  return logs;
};

export default runWebRTCCheck;
