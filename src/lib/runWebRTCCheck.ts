// final_webrtc_diagnose.ts - 最終診断ツールコード（ping/pong + nominated検出 + 15秒待機）

const runWebRTCCheck = async (): Promise<string[]> => {
  const logs: string[] = [];
  logs.push("🔸診断開始");

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
    iceTransportPolicy: 'relay',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: 0,
  };

  const pc = new RTCPeerConnection(config);
  const dc = pc.createDataChannel('test-channel', { ordered: true });
  let receivedPong = false;

  dc.onopen = () => {
    logs.push('✅ DataChannel open');
    dc.send('ping');
    logs.push('📤 sent: ping');
  };

  dc.onmessage = (event) => {
    logs.push(`📨 received: ${event.data}`);
    if (event.data === 'pong') {
      logs.push('✅ pong 応答受信');
      receivedPong = true;
    }
  };

  dc.onclose = () => logs.push('❌ DataChannel closed');
  dc.onerror = (e: Event) => {
    const msg = e instanceof ErrorEvent ? e.message : 'Unknown error';
    logs.push(`⚠ DataChannel error: ${msg}`);
  };

  pc.onicecandidate = (e) => logs.push(`[ICE] candidate: ${e.candidate?.candidate ?? '(完了)'}`);
  pc.oniceconnectionstatechange = () => logs.push(`[ICE] connection: ${pc.iceConnectionState}`);
  pc.onconnectionstatechange = () => logs.push(`[WebRTC] connection: ${pc.connectionState}`);
  pc.onsignalingstatechange = () => logs.push(`[Signal] state: ${pc.signalingState}`);

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    logs.push('📤 SDP offer 作成完了');

    const res = await fetch('https://webrtc-answer.rita-base.com/offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
    });
    const answer = await res.json();
    logs.push('📥 SDP answer 受信');

    await pc.setRemoteDescription(answer);
    logs.push('✅ setRemoteDescription 完了');

    let wait = 0;
    while (pc.iceGatheringState !== 'complete' && wait++ < 30) {
      await new Promise((r) => setTimeout(r, 100));
    }
    logs.push(`[ICE] gathering state: ${pc.iceGatheringState}`);

    await new Promise((resolve) => setTimeout(resolve, 15000)); // ✅ 長めに待つ

    const stats = await pc.getStats();
    let found = false;
    stats.forEach((r) => {
      if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') {
        logs.push(`✅ 使用候補: ${r.localCandidateId} ⇄ ${r.remoteCandidateId}, state=${r.state}`);
        found = true;
      }
    });

    if (found && receivedPong) {
      logs.push('🎉 診断成功: TURN接続 & pong応答あり');
    } else {
      logs.push('❌ 診断失敗: 候補未確定またはpong未到達');
    }
  } catch (err) {
    if (err instanceof Error) {
      logs.push(`❌ エラー発生: ${err.message}`);
    } else {
      logs.push('❌ 不明なエラー発生');
    }
  } finally {
    pc.close();
    logs.push('🔚 PeerConnection closed');
  }

  return logs;
};

export default runWebRTCCheck;
