// runWebRTCCheck.ts - 再確認版（fetchタイムアウト検出付き、DataChannel open期待）

const runWebRTCCheck = async (): Promise<string[]> => {
  const logs: string[] = [];
  const statsLog: string[] = [];

  const config: RTCConfiguration = {
    iceServers: [
      {
        urls: 'turn:50.16.103.67:3478?transport=udp',
        username: 'test',
        credential: 'testpass',
      },
      {
        urls: 'turn:50.16.103.67:3478?transport=tcp',
        username: 'test',
        credential: 'testpass',
      },
    ],
    iceTransportPolicy: 'relay',
    bundlePolicy: 'balanced',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: 0,
  };

  const pc = new RTCPeerConnection(config);
  logs.push('[設定] TURN専用構成を適用しました（UDP+TCP）');

  const dc = pc.createDataChannel('check');
  logs.push('✅ DataChannel を negotiated=false で作成しました');

  pc.onicecandidate = (e) =>
    logs.push('[ICE] candidate: ' + (e.candidate?.candidate ?? '(収集完了)'));
  pc.oniceconnectionstatechange = () =>
    logs.push('[ICE] connection state: ' + pc.iceConnectionState);
  pc.onconnectionstatechange = () => {
    logs.push('[WebRTC] connection state: ' + pc.connectionState);
    if (pc.connectionState === 'closed') {
      logs.push('❌ RTCPeerConnection が切断されました');
    }
  };
  pc.onsignalingstatechange = () =>
    logs.push('[WebRTC] signaling state: ' + pc.signalingState);
  pc.onicegatheringstatechange = () =>
    logs.push('[ICE] gathering state: ' + pc.iceGatheringState);

  dc.onopen = () => {
    logs.push('✅ DataChannel open');
    dc.send('ping');
    logs.push('📤 送信: ping');
  };

  dc.onmessage = (event) => {
    logs.push(`📨 受信: ${event.data}`);
    logs.push('✅ DataChannel 応答確認完了');
    setTimeout(() => {
      logs.push('⏱ DataChannel を維持後に close 実行');
      if (pc.connectionState !== 'closed') {
        pc.close();
        logs.push('✅ RTCPeerConnection を close しました');
      }
    }, 10000);
  };

  dc.onclose = () => logs.push('❌ DataChannel closed');
  dc.onerror = (e) =>
    logs.push(`⚠ DataChannel error: ${(e as ErrorEvent).message}`);

  try {
    logs.push('[STEP] offer 生成 開始');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    logs.push('✅ createOffer & setLocalDescription 完了');

    logs.push('[STEP] /offer へ POST 実行');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://webrtc-answer.rita-base.com/offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`POST /offer failed: status=${res.status}`);
    logs.push('✅ POST /offer 応答あり');

    setTimeout(async () => {
      const stats = await pc.getStats();
      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          statsLog.push(
            `✅ 候補成功: ${report.localCandidateId} ⇄ ${report.remoteCandidateId} [nominated=${report.nominated}]`
          );
        }
      });
      if (statsLog.length === 0) {
        logs.push('⚠ 候補ペアが接続成功状態に至っていません');
      } else {
        logs.push(...statsLog);
      }
    }, 3000);
  } catch (err) {
    logs.push('❌ WebRTC接続に失敗しました');
    if (err instanceof Error) logs.push(`❗詳細: ${err.message}`);
    else logs.push(`❗詳細(unknown): ${JSON.stringify(err)}`);
    pc.close();
    logs.push('🔚 異常終了のため RTCPeerConnection を明示的に close');
  }

  return logs;
};

export default runWebRTCCheck;
