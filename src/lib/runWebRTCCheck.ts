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

  let lastActivity = Date.now();
  let opened = false;

  const dc = pc.createDataChannel("check", {
    ordered: true,
    negotiated: true,
    id: 0,
  });

  dc.onopen = () => {
    opened = true;
    logs.push("✅ DataChannel open");
    logs.push("📤 sent: ping");
    dc.send("ping");
    lastActivity = Date.now();

    // open から10秒間維持 → 明示クローズ
    setTimeout(() => {
      logs.push("⏱ openから10秒保持完了 → close()");
      pc.close();
    }, 10000);
  };

  dc.onmessage = (event) => {
    logs.push(`📨 受信: ${event.data}`);
    lastActivity = Date.now();
  };

  dc.onclose = () => logs.push(`❌ DataChannel closed [state=${dc.readyState}]`);
  dc.onerror = (e) => logs.push(`⚠ DataChannel error: ${(e as ErrorEvent).message}`);

  pc.addEventListener("iceconnectionstatechange", () => {
    logs.push(`[ICE] connection state: ${pc.iceConnectionState}`);
  });

  pc.addEventListener("connectionstatechange", () => {
    logs.push(`[WebRTC] connection state: ${pc.connectionState}`);
  });

  pc.addEventListener("signalingstatechange", () => {
    logs.push(`[WebRTC] signaling state: ${pc.signalingState}`);
  });

  pc.addEventListener("icegatheringstatechange", () => {
    logs.push(`[ICE] gathering state: ${pc.iceGatheringState}`);
  });

  pc.addEventListener("icecandidate", (e) => {
    logs.push('[ICE] candidate: ' + (e.candidate?.candidate ?? '(収集完了)'));
  });

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

    if (!res.ok) throw new Error(`fetchエラー status=${res.status}`);

    const answer = await res.json();
    logs.push("📨 SDP answer受信");
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    logs.push("✅ setRemoteDescription 完了");

    // openが来ない場合に10秒後タイムアウト判定
    setTimeout(() => {
      if (!opened) {
        logs.push("⚠ DataChannelが10秒以内にopenしませんでした → 強制close");
        logs.push(`📡 readyState: ${dc.readyState}`);
        pc.close();
      }
    }, 10000);

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
