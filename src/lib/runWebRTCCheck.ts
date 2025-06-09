// rita-base/src/lib/runWebRTCCheck.ts


export default async function runWebRTCCheck(): Promise<string[]> {
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

  // データチャネルを作成
  const channel = pc.createDataChannel("test-channel");
  channel.onopen = () => {
    logs.push("✅ DataChannel open");
    channel.send("ping");
    logs.push("📤 sent: ping");
  };
  channel.onmessage = (event) => {
    logs.push(`📨 received: ${event.data}`);
  };
  channel.onclose = () => {
    logs.push("❌ DataChannel closed");
  };

  // ICE candidate ログ
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      logs.push(`🧊 ICE candidate: ${event.candidate.candidate}`);
    }
  };

  pc.oniceconnectionstatechange = () => {
    logs.push(`🔄 ICE connection state: ${pc.iceConnectionState}`);
  };

  pc.onconnectionstatechange = () => {
    logs.push(`🔄 Connection state: ${pc.connectionState}`);
  };

  pc.onsignalingstatechange = () => {
    logs.push(`🔄 Signaling state: ${pc.signalingState}`);
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

    const answer = await res.json();
    logs.push("📥 SDP answer 受信");

    await pc.setRemoteDescription(answer);
    logs.push("✅ setRemoteDescription 完了");

    await new Promise<void>((resolve) => setTimeout(resolve, 5000));
    logs.push("⏳ 5秒待機完了");

  } catch (error: any) {
    logs.push(`❌ エラー発生: ${error.message || error}`);
  }

  logs.push("🔚 診断終了");
  return logs;
}
