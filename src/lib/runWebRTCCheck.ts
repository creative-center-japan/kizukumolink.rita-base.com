// rita-base/src/lib/runWebRTCCheck.ts

const runWebRTCCheck = async (): Promise<string[]> => {
  return new Promise((resolve) => {
    const logs: string[] = [];
    let pingInterval: ReturnType<typeof setInterval>;

    const config: RTCConfiguration = {
      iceServers: [
        {
          urls: 'turn:50.16.103.67:3478?transport=udp',
          username: 'test',
          credential: 'testpass',
        },
        {
          urls: 'turn:50.16.103.67:3478?transport=tcp',
          username: 'test',
          credential: 'testpass',
        },
      ],
      iceTransportPolicy: 'relay',
      bundlePolicy: 'balanced',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: 0,
    };

    const pc = new RTCPeerConnection(config);
    logs.push('[設定] TURN専用構成を適用しました（UDP+TCP）');

    const dc = pc.createDataChannel('check');
    logs.push('✅ DataChannel を negotiated=false で作成しました');

    pc.onicecandidate = (e) =>
      logs.push('[ICE] candidate: ' + (e.candidate?.candidate ?? '(収集完了)'));
    pc.oniceconnectionstatechange = () =>
      logs.push('[ICE] connection state: ' + pc.iceConnectionState);
    pc.onconnectionstatechange = () => {
      logs.push('[WebRTC] connection state: ' + pc.connectionState);
      if (pc.connectionState === 'closed') {
        logs.push('❌ RTCPeerConnection が切断されました');
      }
    };
    pc.onsignalingstatechange = () =>
      logs.push('[WebRTC] signaling state: ' + pc.signalingState);
    pc.onicegatheringstatechange = () =>
      logs.push('[ICE] gathering state: ' + pc.iceGatheringState);

    // 🔄 candidate-pair の succeeded を見つけるまで最大60秒間繰り返し取得
    const waitForCandidateSuccess = async (timeoutMs: number = 60000): Promise<boolean> => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const stats = await pc.getStats();
        for (const report of stats.values()) {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            const local = stats.get(report.localCandidateId);
            const remote = stats.get(report.remoteCandidateId);
            logs.push(
              `✅ WebRTC接続成功: ${report.localCandidateId} ⇄ ${report.remoteCandidateId} [nominated=${report.nominated}]`
            );
            if (local && remote) {
              logs.push(`【接続方式】${local.candidateType} → ${remote.candidateType}`);
            }
            return true;
          }
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      logs.push('⚠ 60秒以内に candidate-pair: succeeded が見つかりませんでした');
      return false;
    };

    dc.onopen = () => {
      logs.push('✅ DataChannel open');
      dc.send('ping');
      logs.push('📤 送信: ping');

      // 🔁 5秒おきにping送信
      pingInterval = setInterval(() => {
        dc.send('ping');
        logs.push('📤 定期送信: ping');
      }, 5000);

      setTimeout(async () => {
        logs.push('⏱ DataChannel を 60秒維持後に close 実行');

        await waitForCandidateSuccess(60000);

        const stats = await pc.getStats();
        stats.forEach((report) => {
          if (report.type === 'data-channel') {
            logs.push(`📊 DataChannel統計:\n  messagesSent: ${report.messagesSent}\n  messagesReceived: ${report.messagesReceived}\n  bytesSent: ${report.bytesSent}\n  bytesReceived: ${report.bytesReceived}`);
          }
        });

        clearInterval(pingInterval);
        if (pc.connectionState !== 'closed') {
          pc.close();
          logs.push('✅ RTCPeerConnection を close しました');
        }

        resolve(logs);
      }, 60000);
    };

    dc.onmessage = (event) => {
      logs.push(`📨 受信: ${event.data}`);
      logs.push('✅ DataChannel 応答確認完了');
    };

    dc.onclose = () => {
      clearInterval(pingInterval);
      logs.push('❌ DataChannel closed');
    };

    dc.onerror = (e) =>
      logs.push(`⚠ DataChannel error: ${(e as ErrorEvent).message}`);

    (async () => {
      try {
        logs.push('[STEP] offer 生成 開始');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        logs.push('✅ createOffer & setLocalDescription 完了');

        logs.push('[STEP] /offer へ POST 実行');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch('https://webrtc-answer.rita-base.com/offer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) throw new Error(`POST /offer failed: status=${res.status}`);
        logs.push('✅ POST /offer 応答あり');

        const answer = await res.json();
        await pc.setRemoteDescription(answer);
        logs.push('✅ setRemoteDescription 完了');
      } catch (err) {
        logs.push('❌ WebRTC接続に失敗しました');
        if (err instanceof Error) logs.push(`❗詳細: ${err.message}`);
        else logs.push(`❗詳細(unknown): ${JSON.stringify(err)}`);
        pc.close();
        logs.push('🔚 異常終了のため RTCPeerConnection を明示的に close');
        resolve(logs);
      }
    })();
  });
};

export default runWebRTCCheck;
