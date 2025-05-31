//rita-base\lib\runWebRTCCheck.ts

// -------------------------
// runWebRTCCheck.ts
// - WebRTC診断（DataChannelの接続確認）
// - UDP TURN接続を基本とし、STUN確認を含め relay候補の接続可否を判定
// - 実際のカメラ通信がUDP前提であることを踏まえ、TCPはVercel等環境限定で補完
// - 成功時は DataChannel open と candidate-pair succeeded をログ出力
// -------------------------

export const runWebRTCCheck = async (): Promise<string[]> => {
  const logs: string[] = [];
  let dataChannelOpened = false;
  let pingConfirmed = false;
  let candidatePairSucceeded = false;

  const config: RTCConfiguration = {
    iceServers: [
      {
        urls: ['turn:3.80.218.25:3478?transport=udp'],
        username: 'test',
        credential: 'testpass',
      },
      {
        urls: ['turn:3.80.218.25:3478?transport=tcp'],
        username: 'test',
        credential: 'testpass',
      }
    ],
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    iceCandidatePoolSize: 0,
  };

  logs.push(`[設定] iceServers: ${JSON.stringify(config.iceServers)}`);


  const pc = new RTCPeerConnection(config);
  const dc = pc.createDataChannel("check");
  logs.push("\u{1F527} DataChannel 作成済み");

  dc.onopen = () => {
    logs.push("\u{2705} WebRTC: DataChannel open!");
    dc.send("ping");
    logs.push("\u{1F4E4} ping を送信しました");
    dataChannelOpened = true;
  };

  dc.onmessage = (event) => {
    logs.push(`\u{1F4E8} 受信メッセージ: ${event.data}`);
    if (event.data === "pong") {
      pingConfirmed = true;
      logs.push("\u{2705} pong を受信 → DataChannel 応答OK");
    }
  };

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      logs.push(`ICE候補: ${e.candidate.candidate}`);
      if (e.candidate.candidate.includes("typ relay")) {
        logs.push("\u{2705} relay候補を検出");
      }
    } else {
      logs.push("ICE候補: 収集完了（null候補）");
      pc.addIceCandidate(null); // 明示的にend-of-candidates送信
    }
  };

  pc.oniceconnectionstatechange = () => {
    logs.push(`ICE接続状態: ${pc.iceConnectionState}`);
  };

  pc.onconnectionstatechange = () => {
    logs.push(`全体接続状態: ${pc.connectionState}`);
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  logs.push("\u{1F4DD} SDP offer 生成・セット完了");

  const res = await fetch("https://webrtc-answer.rita-base.com/offer", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sdp: offer.sdp, type: offer.type })
  });
  const answer = await res.json();
  await pc.setRemoteDescription(answer);
  logs.push("\u{1F4E5} SDP answer 受信・セット完了");

  for (let i = 0; i < 20; i++) {
    if (dataChannelOpened && pingConfirmed) break;
    await new Promise(r => setTimeout(r, 1000));
  }

  const stats = await pc.getStats();
  stats.forEach(report => {
    if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.nominated) {
      const local = report.localCandidateId;
      const localCand = stats.get(local);
      if (localCand?.candidateType === 'relay') {
        logs.push("\u{2705} TURN中継通信に成功（candidate-pair: succeeded, relay）");
      } else {
        logs.push("\u{2705} P2P接続に成功（candidate-pair: succeeded, host/srflx）");
      }
      candidatePairSucceeded = true;
    }
  });

  if (!candidatePairSucceeded) {
    logs.push("\u{274C} 接続候補ペアが確立しませんでした（succeeded候補なし）");
  }

  if (dataChannelOpened && pingConfirmed) {
    logs.push("\u{2705} DataChannel 接続＋応答確認 成功");
    logs.push("【判定】OK");
  } else {
    logs.push("\u{274C} DataChannel 開通または応答失敗");
    logs.push("【判定】NG");
  }

  pc.close();
  return logs;
};
