// rita-base/src/lib/runWebRTCCheck.ts

const runWebRTCCheck = async (): Promise<string[]> => {
  const logs: string[] = [];
  logs.push("🔸診断開始");

  const config: RTCConfiguration = {
    iceServers: [
      { urls: "stun:3.80.218.25:3478" },
      {
        urls: "turn:3.80.218.25:3478?transport=udp",
        username: "test",
        credential: "testpass",
      },
      {
        urls: "turn:3.80.218.25:3478?transport=tcp",
        username: "test",
        credential: "testpass",
      },
    ],
    iceTransportPolicy: "all",
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    iceCandidatePoolSize: 0,
  };

  const pc = new RTCPeerConnection(config);

  const dc = pc.createDataChannel("test-channel", { ordered: true });

  dc.onopen = () => {
    logs.push("✅ DataChannel open");
    dc.send("ping");
    logs.push("📤 sent: ping");
  };

  dc.onmessage = (e) => {
    logs.push(`📨 received: ${e.data}`);
    logs.push("✅ DataChannel 応答確認完了（pong）");

    // 🔁 安定確認のため5秒後に close
    setTimeout(() => {
      if (pc.connectionState !== "closed") {
        pc.close();
        logs.push("🔚 RTCPeerConnection を close しました");
      }
    }, 5000);
  };

  dc.onerror = (e) => logs.push(`⚠ DataChannel error: ${(e as ErrorEvent).message}`);
  dc.onclose = () => logs.push("❌ DataChannel closed");

  pc.onicecandidate = (e) => {
    logs.push(`[ICE] candidate: ${e.candidate?.candidate ?? "(収集完了)"}`);
  };
  pc.oniceconnectionstatechange = () => {
    logs.push(`[ICE] connection state: ${pc.iceConnectionState}`);
  };
  pc.onconnectionstatechange = () => {
    logs.push(`[WebRTC] connection state: ${pc.connectionState}`);
  };
  pc.onsignalingstatechange = () => {
    logs.push(`[WebRTC] signaling state: ${pc.signalingState}`);
  };

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    logs.push("📤 SDP offer 作成・送信");

    const res = await fetch("https://webrtc-answer.rita-base.com/offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(offer),
    });

    if (!res.ok) throw new Error(`status=${res.status}`);
    const answer = await res.json();
    logs.push("📥 SDP answer 受信");

    await pc.setRemoteDescription(answer);
    logs.push("✅ setRemoteDescription 完了");

    // ICE gathering 完了まで待機
    let wait = 0;
    while (pc.iceGatheringState !== "complete" && wait++ < 30) {
      await new Promise((r) => setTimeout(r, 100));
    }
    logs.push(`[ICE] gathering 完了: ${pc.iceGatheringState}`);

    // 5秒後に統計取得
    await new Promise((r) => setTimeout(r, 5000));
    const stats = await pc.getStats();
    stats.forEach((r) => {
      if (r.type === "candidate-pair" && r.nominated) {
        logs.push(`✅ 使用中candidate-pair: ${r.localCandidateId} ⇄ ${r.remoteCandidateId} state=${r.state}`);
      }
    });
  } catch (err) {
    logs.push("❌ WebRTC診断中にエラー");
    logs.push(`❗ 詳細: ${(err as Error).message}`);
    pc.close();
  }

  logs.push("🔚 診断終了");
  return logs;
};

export default runWebRTCCheck;
