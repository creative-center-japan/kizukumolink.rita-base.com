//rita-base\lib\runWebRTCCheck.ts

// -------------------------
// runWebRTCCheck.ts
// - WebRTC診断（DataChannelの接続確認）
// - UDP TURN接続を基本とし、STUN確認を含め relay候補の接続可否を判定
// - 実際のカメラ通信がUDP前提であることを踏まえ、TCPはVercel等環境限定で補完
// - 成功時は DataChannel open と candidate-pair succeeded をログ出力
// -------------------------

const runWebRTCCheck = async (): Promise<string[]> => {
  const logs: string[] = [];
  let success = false;

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
  const dc = pc.createDataChannel("check"); // negotiated: false

  // ✅ DataChannel が開くのを最大10秒待機
  const waitForOpen = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("DataChannelの接続が10秒以内に完了しませんでした"));
    }, 10000);

    dc.onopen = () => {
      logs.push("✅ DataChannel open!");
      dc.send("ping");
      logs.push("📤 ping を送信しました");
      success = true;
      clearTimeout(timeout);
      resolve();
    };
  });

  dc.onmessage = (event) => {
    logs.push(`📨 受信メッセージ: ${event.data}`);
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const res = await fetch("https://webrtc-answer.rita-base.com/offer", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
  });

  const answer = await res.json();
  await pc.setRemoteDescription(answer);

  pc.onicecandidate = async (event) => {
    if (event.candidate) {
      const cand = event.candidate.candidate;
      if (cand.includes("typ srflx")) logs.push("🌐 srflx: 応答あり");
      if (cand.includes("typ relay")) logs.push("🔁 relay: TURN中継成功");

      await fetch("https://webrtc-answer.rita-base.com/ice-candidate", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate: event.candidate,
          pc_id: answer.pc_id,
        }),
      });
    }
  };

  await new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") resolve();
    else pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") resolve();
    };
  });

  try {
    await waitForOpen;
  } catch (err) {
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
