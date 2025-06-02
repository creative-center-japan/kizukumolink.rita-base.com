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
        credential: 'testpass'
      },
      {
        urls: 'turn:3.80.218.25:3478?transport=tcp',
        username: 'test',
        credential: 'testpass'
      }
    ],
    iceTransportPolicy: 'relay',
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

    // ✅ 接続成功時に candidate-pair を調査
    if (pc.iceConnectionState === 'connected') {
      setTimeout(async () => {
        const stats = await pc.getStats();
        let candidatePairInfo = '❌ 候補ペア情報が取得できませんでした';

        type CandidateWithIP = RTCStats & { ip?: string; port?: number };
        const localCandidates = new Map<string, CandidateWithIP>();
        const remoteCandidates = new Map<string, CandidateWithIP>();

        stats.forEach(report => {
          if (report.type === 'local-candidate') {
            localCandidates.set(report.id, report as CandidateWithIP);
          } else if (report.type === 'remote-candidate') {
            remoteCandidates.set(report.id, report as CandidateWithIP);
          }
        });

        stats.forEach(report => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.nominated) {
            const local = localCandidates.get(report.localCandidateId);
            const remote = remoteCandidates.get(report.remoteCandidateId);
            if (local && remote) {
              candidatePairInfo = `ICE Candidate pair: ${local.ip ?? '??'}:${local.port ?? '??'} <=> ${remote.ip ?? '??'}:${remote.port ?? '??'}`;
            }
          }
        });

        logs.push(candidatePairInfo);
      }, 300);
    }
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

  dc.onmessage = (event) => {
    logs.push(`📨 受信メッセージ: ${event.data}`);
  };

  dc.onclose = () => logs.push("❌ DataChannel closed");
  dc.onerror = (e) => logs.push(`⚠ DataChannel error: ${(e as ErrorEvent).message}`);

  let pingInterval: ReturnType<typeof setInterval> | undefined;

  const waitForOpen = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("DataChannelの接続が10秒以内に完了しませんでした"));
    }, 10000);

    dc.onopen = () => {
      logs.push("✅ DataChannel open");

      if (dc.readyState === "open") {
        dc.send("ping");
        logs.push("📤 ping を送信しました");

        pingInterval = setInterval(() => {
          if (dc.readyState === "open") {
            dc.send("ping");
            logs.push("📤 ping keepalive");
          } else {
            logs.push("🛑 keepalive 停止（closed）");
            clearInterval(pingInterval);
          }
        }, 3000);
      }

      clearTimeout(timeout);
      resolve();
    };
  });

  const offer = await pc.createOffer({
    offerToReceiveAudio: false,
    offerToReceiveVideo: false,
    iceRestart: true
  });

  await pc.setLocalDescription(offer);

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

  try {
    const res = await fetch("https://webrtc-answer.rita-base.com/offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sdp: pc.localDescription!.sdp,
        type: pc.localDescription!.type
      })
    });

    if (!res.ok) {
      throw new Error(`fetchエラー status=${res.status}`);
    }

    const answer = await res.json();
    logs.push("📨 サーバからSDP answerを受信");

    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    logs.push("✅ setRemoteDescription 完了");
  } catch (err) {
    logs.push(`❌ SDP answer 取得・設定失敗: ${(err as Error).message}`);
    pc.close();
    return logs;
  }

  try {
    await waitForOpen;
    logs.push("✅ DataChannel 接続＋応答確認 成功");

    await new Promise((res) => setTimeout(res, 15000));
    logs.push("⏱ 接続を15秒保持後にclose");

    if (pingInterval) clearInterval(pingInterval);
    logs.push("【判定】OK");
  } catch (err: unknown) {
    logs.push("❌ WebRTC接続に失敗しました（DataChannel未確立）");
    if (err instanceof Error) {
      logs.push(`詳細: ${err.message}`);
    }
  }

  pc.close();
  return logs;
};

export default runWebRTCCheck;
