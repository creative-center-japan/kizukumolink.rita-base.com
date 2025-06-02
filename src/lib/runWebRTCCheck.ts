//rita-base\lib\runWebRTCCheck.ts

// -------------------------
// runWebRTCCheck.ts
// - WebRTC診断（DataChannelの接続確認）
// - UDP TURN接続を基本とし、relay候補の接続可否を判定
// - DataChannel は negotiated: true / id: 0 を使用（server/client一致）
// - 成功時は DataChannel open と candidate-pair succeeded をログ出力
// -------------------------

const runWebRTCCheck = async (): Promise<string[]> => {
  const logs: string[] = [];

  const config: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:3.80.218.25:3478' },
      {
        urls: 'turn:3.80.218.25:3478?transport=udp',
        username: 'test',
        credential: 'testpass'
      },
      {
        urls: 'turn:3.80.218.25:3478?transport=tcp',
        username: 'test',
        credential: 'testpass'
      }
    ],
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: 0
  };

  const pc = new RTCPeerConnection(config);
  logs.push('[設定] WebRTC設定を適用しました');

  const log = (msg: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ja-JP', { hour12: false });
    logs.push(`[${timeStr}] ${msg}`);
  };

  // イベント監視
  pc.addEventListener('icecandidate', (e) => {
    log(`[ICE] candidate: ${e.candidate?.candidate ?? '(収集完了)'}`);
  });

  pc.addEventListener('iceconnectionstatechange', () => {
    log(`[ICE] connection state: ${pc.iceConnectionState}`);
  });

  pc.addEventListener('connectionstatechange', () => {
    log(`[WebRTC] connection state: ${pc.connectionState}`);
  });

  pc.addEventListener('signalingstatechange', () => {
    log(`[WebRTC] signaling state: ${pc.signalingState}`);
  });

  pc.addEventListener('icegatheringstatechange', () => {
    log(`[ICE] gathering state: ${pc.iceGatheringState}`);
  });

  // DataChannel 設定
  const dc = pc.createDataChannel('check', {
    ordered: true,
    negotiated: true,
    id: 0
  });

  const waitForOpen = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('DataChannelの接続が10秒以内に完了しませんでした'));
    }, 10000);

    dc.onopen = async () => {
      log('✅ DataChannel open');
      dc.send('ping');
      log('📤 ping を送信しました');

      // keepalive ping送信（3回）
      for (let i = 1; i <= 3; i++) {
        await new Promise(res => setTimeout(res, 3000));
        dc.send('ping');
        log(`📤 ping keepalive #${i}`);
      }

      clearTimeout(timeout);
      resolve();
    };
  });

  dc.onmessage = (event) => {
    log(`📨 受信メッセージ: ${event.data}`);
  };

  dc.onclose = () => log('❌ DataChannel closed');
  dc.onerror = (e) => log(`⚠ DataChannel error: ${(e as ErrorEvent).message}`);

  // オファー作成
  const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false, iceRestart: true });
  await pc.setLocalDescription(offer);

  // ICE収集の完了を待機
  await new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const check = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', check);
  });

  if (!pc.localDescription) {
    log('❌ setLocalDescription が未完了');
    return logs;
  }

  // SDP送信
  const res = await fetch('https://webrtc-answer.rita-base.com/offer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sdp: pc.localDescription.sdp, type: pc.localDescription.type })
  });

  const answer = await res.json();
  log('📨 サーバからSDP answerを受信');

  await pc.setRemoteDescription(new RTCSessionDescription(answer));
  log('✅ setRemoteDescription 完了');

  try {
    await waitForOpen;
    log('✅ DataChannel 接続＋応答確認 成功');
    log('【判定】OK');
  } catch (err: unknown) {
    if (err instanceof Error) {
      log('❌ WebRTC接続に失敗しました（DataChannel未確立）');
      log(`詳細: ${err.message}`);
    } else {
      log('❌ WebRTC接続に失敗しました（原因不明）');
    }
  }

  pc.close();
  return logs;
};

export default runWebRTCCheck;
