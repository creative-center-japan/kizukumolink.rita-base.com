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

  logs.push(`[設定] iceServers: ${JSON.stringify(config.iceServers)}`);

  const pc = new RTCPeerConnection(config);
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
      logs.push("✅ DataChannel open!");
      dc.send("ping");
      logs.push("📤 ping を送信しました");

      // ✅ TURNセッションが維持されるよう 3秒ほど待つ
      await new Promise(res => setTimeout(res, 7000));

      clearTimeout(timeout);
      resolve();
    };
  });

  dc.onmessage = (event) => {
    logs.push(`📨 受信メッセージ: ${event.data}`);
  };

  const offer = await pc.createOffer({
    offerToReceiveAudio: false,
    offerToReceiveVideo: false,
    iceRestart: true,
  });

  await pc.setLocalDescription(offer);

  // ICE候補収集完了を待機
  await new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") resolve();
    else pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") resolve();
    };
  });

  const res = await fetch("https://webrtc-answer.rita-base.com/offer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sdp: pc.localDescription!.sdp, type: pc.localDescription!.type }),
  });

  const answer = await res.json();
  await pc.setRemoteDescription(answer);

  pc.onicecandidate = async (event: RTCPeerConnectionIceEvent) => {
    if (event.candidate) {
      const cand = event.candidate.candidate;
      if (cand.includes("typ srflx")) logs.push("🌐 srflx: 応答あり");
      if (cand.includes("typ relay")) logs.push("🔁 relay: TURN中継成功");

      await fetch("https://webrtc-answer.rita-base.com/ice-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: event.candidate,
          pc_id: answer.pc_id,
        }),
      });
    }
  };

  try {
    await waitForOpen;
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
