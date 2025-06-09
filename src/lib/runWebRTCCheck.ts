// rita-base/src/lib/runWebRTCCheck.ts

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

  // ✅ ICEステータス変化監視
  pc.addEventListener("iceconnectionstatechange", () => {
    logs.push(`[ICE] connection state: ${pc.iceConnectionState}`);
  });
  pc.addEventListener("icegatheringstatechange", () => {
    logs.push(`[ICE] gathering state: ${pc.iceGatheringState}`);
  });
  pc.addEventListener("connectionstatechange", () => {
    logs.push(`[WebRTC] connection state: ${pc.connectionState}`);
  });
  pc.addEventListener("signalingstatechange", () => {
    logs.push(`[WebRTC] signaling state: ${pc.signalingState}`);
  });
  pc.addEventListener("icecandidate", (e) => {
    logs.push(`[ICE] candidate: ${e.candidate?.candidate ?? "(完了)"}`);
  });

  // ✅ DataChannel作成
  const dc = pc.createDataChannel("check", { ordered: true });

  dc.onopen = () => {
    logs.push("✅ DataChannel open");
    dc.send("ping");
    logs.push("📤 送信: ping");
  };

  dc.onmessage = (e) => {
    logs.push(`📨 受信: ${e.data}`);
    logs.push("✅ DataChannel 応答確認完了");

    setTimeout(() => {
      if (pc.connectionState !== "closed") {
        pc.close();
        logs.push("🔚 RTCPeerConnection を close しました");
      }
    }, 1000);
  };

  dc.onerror = (e) => logs.push(`⚠ DataChannel error: ${(e as ErrorEvent).message}`);
  dc.onclose = () => logs.push("❌ DataChannel closed");

  try {
    logs.push("[STEP] /camera-status を fetch 開始");
    const res = await fetch("https://webrtc-answer.rita-base.com/camera-status");
    const offer = await res.json();
    logs.push("✅ offer を取得");

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    logs.push("✅ setRemoteDescription 完了");

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    logs.push("✅ setLocalDescription 完了");

    // ICE gathering完了待ち
    let wait = 0;
    while (pc.iceGatheringState !== "complete" && wait++ < 30) {
      await new Promise((res) => setTimeout(res, 100));
    }
    logs.push(`[ICE] gathering 完了: ${pc.iceGatheringState}`);

    // ✅ CandidatePairの使用状態確認（数秒待機後）
    await new Promise((res) => setTimeout(res, 2000));
    const stats = await pc.getStats();
    stats.forEach((report) => {
      if (report.type === "candidate-pair" && report.nominated) {
        logs.push(`✅ 使用中candidate-pair: state=${report.state}, local=${report.localCandidateId}, remote=${report.remoteCandidateId}`);
      }
      if (report.type === "remote-candidate") {
        logs.push(`🌐 remote-candidate: ${report.candidateType} ${report.ip}:${report.port}`);
      }
    });

  } catch (err) {
    logs.push("❌ WebRTC処理中にエラー");
    if (err instanceof Error) logs.push(`❗詳細: ${err.message}`);
    pc.close();
  }

  return logs;
};

export default runWebRTCCheck;

