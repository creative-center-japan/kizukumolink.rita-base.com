// runWebRTCCheck.ts - 最終版（POST /offer 対応 + TDP除外 + ICE確認）

const runWebRTCCheck = async (): Promise<string[]> => {
  const logs: string[] = [];
  const statsLog: string[] = [];

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

  const dc = pc.createDataChannel('test-channel', { ordered: true });

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

    logs.push('[STEP] /offer へ POST 実行');
    const res2 = await fetch('https://webrtc-answer.rita-base.com/offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sdp: answer.sdp,
        type: answer.type,
      }),
    });
    if (!res2.ok) throw new Error(`POST /offer failed: status=${res2.status}`);
    logs.push('✅ POST /offer 応答あり');

    setTimeout(async () => {
      const stats = await pc.getStats();
      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          statsLog.push(`✅ 候補成功: ${report.localCandidateId} ⇄ ${report.remoteCandidateId} [nominated=${report.nominated}]`);
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
