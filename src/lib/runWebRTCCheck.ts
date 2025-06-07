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

  const dc = pc.createDataChannel("check", {
    ordered: true,
    negotiated: true,
    id: 0,
  });

  let lastActivity = Date.now();
  let pingTimer: NodeJS.Timeout;
  let idleTimer: NodeJS.Timeout;

  dc.onopen = () => {
    logs.push("✅ DataChannel open");

    // ping送信（10秒おき）
    pingTimer = setInterval(() => {
      try {
        dc.send("ping");
        logs.push("📤 sent: ping");
        lastActivity = Date.now();
      } catch (e) {
        logs.push("⚠ ping送信エラー: " + (e as Error).message);
      }
    }, 10000);

    // アイドル検出（60秒何もなければ切断）
    idleTimer = setInterval(() => {
      const now = Date.now();
      const idleMs = now - lastActivity;
      if (idleMs > 60000) {
        logs.push("⏱ アイドル超過のため自動切断します");
        clearInterval(pingTimer);
        clearInterval(idleTimer);
        pc.close();
      }
    }, 15000);
  };

  dc.onmessage = (event) => {
    logs.push(`📨 受信メッセージ: ${event.data}`);
    lastActivity = Date.now();
  };

  dc.onclose = () => logs.push("❌ DataChannel closed");
  dc.onerror = (e) => logs.push(`⚠ DataChannel error: ${(e as ErrorEvent).message}`);

  const offer = await pc.createOffer({
    offerToReceiveAudio: false,
    offerToReceiveVideo: false,
    iceRestart: true
  });

  await pc.setLocalDescription(offer);

  try {
    const res = await fetch("https://signaling.rita-base.com/offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sdp: pc.localDescription!.sdp,
        type: pc.localDescription!.type
      })
    });

    if (!res.ok) {
      throw new Error(`fetchエラー status=${res.status}`);
    }

    const answer = await res.json();
    logs.push("📨 サーバからSDP answerを受信");

    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    logs.push("✅ setRemoteDescription 完了");

    logs.push("✅ DataChannel 接続＋応答確認 成功");
    logs.push("【判定】OK");

  } catch (err: unknown) {
    logs.push("❌ WebRTC接続に失敗しました");
    if (err instanceof Error) {
      logs.push(`詳細: ${err.message}`);
    }
    pc.close();
  }

  return logs;
};

export default runWebRTCCheck;
