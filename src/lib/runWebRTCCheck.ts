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
      { urls: 'turn:3.80.218.25:3478?transport=udp', username: 'test', credential: 'testpass' },
      { urls: 'turn:3.80.218.25:3478?transport=tcp', username: 'test', credential: 'testpass' }
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

  const waitForOpen = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("DataChannelが10秒以内に開通しませんでした"));
    }, 10000);

    dc.onopen = async () => {
      logs.push("✅ DataChannel open");
      dc.send("ping");
      logs.push("📤 ping を送信しました");

      for (let i = 1; i <= 3; i++) {
        await new Promise(res => setTimeout(res, 3000));
        dc.send("ping");
        logs.push(`📤 keepalive ping #${i}`);
      }

      clearTimeout(timeout);
      resolve();
    };
  });

  dc.onmessage = (e) => logs.push(`📨 受信: ${e.data}`);
  dc.onclose = () => logs.push("❌ DataChannel closed");
  dc.onerror = (e) => logs.push(`⚠ DataChannel error: ${(e as ErrorEvent).message}`);

  const offer = await pc.createOffer({ iceRestart: true });
  await pc.setLocalDescription(offer);

  await new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const check = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", check);
  });

  if (!pc.localDescription) {
    logs.push("❌ setLocalDescription が未完了");
    return logs;
  }

  const res = await fetch("https://webrtc-answer.rita-base.com/offer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pc.localDescription)
  });

  const answer = await res.json();
  logs.push("📨 サーバからSDP answerを受信");

  await pc.setRemoteDescription(new RTCSessionDescription(answer));
  logs.push("✅ setRemoteDescription 完了");

  try {
    await waitForOpen;
    logs.push("✅ DataChannel 応答確認 成功");
    logs.push("【判定】OK");
  } catch (err: unknown) {
    if (err instanceof Error) {
      logs.push("❌ DataChannel 未確立");
      logs.push(`詳細: ${err.message}`);
    } else {
      logs.push("❌ DataChannel 確立失敗（不明なエラー）");
    }
  }

  await new Promise(res => setTimeout(res, 3000)); // 保持のため少し待つ
  pc.close();
  return logs;
};

export default runWebRTCCheck;
