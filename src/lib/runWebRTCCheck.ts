// runWebRTCCheck.ts - 最終診断用のWebRTCチェック関数

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
    ],
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: 0,
  };

  const pc = new RTCPeerConnection(config);
  const statsLog: string[] = [];

  logs.push('[構成] WebRTC設定を適用しました');

  pc.onicecandidate = (e) => {
    logs.push('[ICE] candidate: ' + (e.candidate?.candidate ?? '(収集完了)'));
  };
  pc.oniceconnectionstatechange = () => {
    logs.push('[ICE] connection state: ' + pc.iceConnectionState);
  };
  pc.onconnectionstatechange = () => {
    logs.push('[WebRTC] connection state: ' + pc.connectionState);
  };
  pc.onsignalingstatechange = () => {
    logs.push('[WebRTC] signaling state: ' + pc.signalingState);
  };
  pc.onicegatheringstatechange = () => {
    logs.push('[ICE] gathering state: ' + pc.iceGatheringState);
  };

  const dc = pc.createDataChannel('test-channel');

  dc.onopen = () => {
    logs.push('✅ DataChannel open');
    dc.send('ping');
    logs.push('📤 ping送信');
  };
  dc.onmessage = (event) => {
    logs.push('📨 DataChannel受信: ' + event.data);
    logs.push('✅ DataChannel応答確認');

    setTimeout(() => {
      if (pc.connectionState !== 'closed') {
        logs.push('⏱ 15秒後にPeerConnectionをcloseします');
        pc.close();
        logs.push('✅ RTCPeerConnectionをcloseしました');
      }
    }, 15000);
  };
  dc.onclose = () => logs.push('❌ DataChannel closed');
  dc.onerror = (e) => logs.push(`⚠ DataChannel error: ${(e as ErrorEvent).message}`);

  try {
    logs.push('[STEP] /camera-statusへfetch実行');
    const res = await fetch('https://webrtc-answer.rita-base.com/camera-status');
    if (!res.ok) throw new Error(`status=${res.status}`);
    const offer = await res.json();
    logs.push('✅ /camera-statusからSDP受信完了');

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    logs.push('✅ setRemoteDescription完了');

    const answer = await pc.createAnswer();
    logs.push('✅ createAnswer完了');

    await pc.setLocalDescription(answer);
    logs.push('✅ setLocalDescription完了');

    setTimeout(async () => {
      const stats = await pc.getStats();
      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          statsLog.push(`✅ 成功候補: ${report.localCandidateId} ⇄ ${report.remoteCandidateId} [nominated=${report.nominated}]`);
        }
      });

      if (statsLog.length === 0) {
        logs.push('⚠ 成功状態の候補ペアが見つかりませんでした');
      } else {
        logs.push(...statsLog);
      }
    }, 5000);

  } catch (err) {
    logs.push('❌ WebRTC接続に失敗しました');
    if (err instanceof Error) {
      logs.push('❗詳細: ' + err.message);
    }
    pc.close();
    logs.push('🔚 異常終了によりRTCPeerConnectionをcloseしました');
  }

  return logs;
};

export default runWebRTCCheck;
