// runWebRTCCheck.ts - 最終マージ版（疎通確認用、DataChannel + TURN経由チェック）

const runWebRTCCheck = async (): Promise<string[]> => {
  const logs: string[] = [];
  const statsLog: string[] = [];

  const config: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:3.80.218.25:3478' },
      { urls: 'turn:3.80.218.25:3478?transport=udp', username: 'test', credential: 'testpass' },
      { urls: 'turn:3.80.218.25:3478?transport=tcp', username: 'test', credential: 'testpass' },
    ],
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: 0,
  };

  const pc = new RTCPeerConnection(config);

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

  const dc = pc.createDataChannel('check');

  dc.onopen = () => {
    logs.push('✅ DataChannel open');
    dc.send('ping');
    logs.push('📤 送信: ping');
  };
  dc.onmessage = (event) => {
    logs.push(`📨 受信: ${event.data}`);
  };
  dc.onclose = () => logs.push('❌ DataChannel closed');
  dc.onerror = (e) => logs.push(`⚠ DataChannel error: ${(e as ErrorEvent).message}`);

  try {
    logs.push('[STEP] /camera-status へ fetch 開始');
    const res = await fetch('https://webrtc-answer.rita-base.com/camera-status');
    if (!res.ok) throw new Error(`status=${res.status}`);
    const offer = await res.json();
    logs.push('✅ /camera-status から SDP offer を受信');

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    logs.push('✅ setRemoteDescription 完了');

    const answer = await pc.createAnswer();
    logs.push('✅ createAnswer 完了');

    await pc.setLocalDescription(answer);
    logs.push('✅ setLocalDescription 完了');

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const stats = await pc.getStats();
    stats.forEach((report) => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.nominated) {
        statsLog.push(`✅ 候補成功: ${report.localCandidateId} ⇄ ${report.remoteCandidateId} [nominated]`);
      }
    });

    if (statsLog.length === 0) {
      logs.push('⚠ 候補ペアが接続成功状態に至っていません');
    } else {
      logs.push(...statsLog);
    }
  } catch (err) {
    logs.push('❌ WebRTC接続に失敗しました');
    if (err instanceof Error) logs.push(`❗詳細: ${err.message}`);
    pc.close();
    logs.push('🔚 異常終了のため RTCPeerConnection を明示的に close');
  }

  return logs;
};

export default runWebRTCCheck;
