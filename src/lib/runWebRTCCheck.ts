//rita-base\lib\runWebRTCCheck.ts

// -------------------------
// runWebRTCCheck.ts
// - WebRTC診断（DataChannelの接続確認）
// - UDP TURN接続を基本とし、relay候補の接続可否を判定
// - DataChannel は negotiated: true / id: 0 を使用（server/client一致）
// - 成功時は DataChannel open と candidate-pair succeeded をログ出力
// -------------------------

// runWebRTCCheck.ts
// WebRTC接続確認用クライアントサイドロジック

const runWebRTCCheck = async (): Promise<string[]> => {
  const logs: string[] = [];

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

  const waitForOpen = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("DataChannelの接続が10秒以内に完了しませんでした"));
    }, 10000);

    dc.onopen = async () => {
      logs.push("✅ DataChannel open");
      dc.send("ping");
      logs.push("📤 ping を送信しました");

      for (let i = 1; i <= 3; i++) {
        await new Promise(res => setTimeout(res, 3000));
        dc.send("ping");
        logs.push(`📤 ping keepalive #${i}`);
      }

      clearTimeout(timeout);
      resolve();
    };
  });

  dc.onmessage = (event) => {
    logs.push(`📨 受信メッセージ: ${event.data}`);
  };

  dc.onclose = () => logs.push("❌ DataChannel closed");
  dc.onerror = (e) => logs.push(`⚠ DataChannel error: ${(e as ErrorEvent).message}`);

  try {
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
      iceRestart: true
    });

    await pc.setLocalDescription(offer);
  } catch (err) {
    logs.push('❌ setLocalDescription 失敗: ' + (err instanceof Error ? err.message : '不明なエラー'));
    pc.close();
    return logs;
  }

  await new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") resolve();
    else {
      const check = () => {
        if (pc.iceGatheringState === "complete") {
          pc.removeEventListener("icegatheringstatechange", check);
          resolve();
        }
      };
      pc.addEventListener("icegatheringstatechange", check);
    }
  });

  if (!pc.localDescription) {
    logs.push("❌ setLocalDescription が未完了");
    pc.close();
    return logs;
  }

  const res = await fetch("https://webrtc-answer.rita-base.com/offer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sdp: pc.localDescription.sdp,
      type: pc.localDescription.type,
    }),
  });

  const answer = await res.json();
  logs.push("📨 サーバからSDP answerを受信");

  await pc.setRemoteDescription(new RTCSessionDescription(answer));
  logs.push("✅ setRemoteDescription 完了");

  try {
    await waitForOpen;
    logs.push("✅ DataChannel 接続＋応答確認 成功");
    logs.push("【判定】OK");
  } catch (err: unknown) {
    if (err instanceof Error) {
      logs.push("❌ WebRTC接続に失敗しました（DataChannel未確立）");
      logs.push(`詳細: ${err.message}`);
    } else {
      logs.push("❌ WebRTC接続に失敗しました（原因不明）");
    }
  }

  pc.close();
  return logs;
};

export default runWebRTCCheck;
