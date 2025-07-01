// rita-base\lib\runWebRTCCheck.ts

const runWebRTCCheck = ({ policy = 'relay', timeoutMillisec = 3000, myGlobalIP }: { policy?: 'relay' | 'all'; timeoutMillisec?: number; myGlobalIP: string }): Promise<string[]> => {
  return new Promise((resolve) => {
    const logs: string[] = [];
    let pingInterval: ReturnType<typeof setInterval>;
    let alreadyResolved = false;

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
      iceTransportPolicy: policy,
      bundlePolicy: 'balanced',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: 0,
    };

    logs.push(`[設定] ICEポリシー = ${policy.toUpperCase()}`);

    const pc = new RTCPeerConnection(config);
    const dc = pc.createDataChannel('check');
    logs.push('✅ DataChannel を negotiated=false で作成しました');

    const candidateMap: Record<string, RTCIceCandidate> = {};

    pc.onicecandidate = (e) => {
      logs.push('[ICE] candidate: ' + (e.candidate?.candidate ?? '(収集完了)'));
      if (e.candidate) {
        const foundation = (e.candidate as RTCIceCandidate).foundation;
        if (foundation) {
          candidateMap[foundation] = e.candidate as RTCIceCandidate;
        }
      }
    };



const runWebRTCCheck = ({ policy = 'relay', timeoutMillisec = 3000, myGlobalIP }: { policy?: 'relay' | 'all'; timeoutMillisec?: number; myGlobalIP: string }): Promise<string[]> => {
  return new Promise((resolve) => {
    const logs: string[] = [];
    let pingInterval: ReturnType<typeof setInterval>;
    let alreadyResolved = false;

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
      iceTransportPolicy: policy,
      bundlePolicy: 'balanced',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: 0,
    };

    logs.push(`[設定] ICEポリシー = ${policy.toUpperCase()}`);

    const pc = new RTCPeerConnection(config);
    const dc = pc.createDataChannel('check');
    logs.push('✅ DataChannel を negotiated=false で作成しました');

    const handleSuccessAndExit = async (report: RTCIceCandidatePairStats) => {
      const stats = await pc.getStats();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const local = stats.get(report.localCandidateId) as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const remote = stats.get(report.remoteCandidateId) as any;

      logs.push(`✅ WebRTC接続成功: ${report.localCandidateId} ⇄ ${report.remoteCandidateId} [nominated=${report.nominated}]`);
      let isNg = false;

      if (local && remote) {
        logs.push(`【 接続方式候補 】${local.candidateType}`);
        logs.push(`【 接続形態 】${local.candidateType === 'relay' ? 'TURNリレー（中継）' : 'P2P（直接）'}`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const localIP = (local as any).address || (local as any).ip || '';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const remoteIP = (remote as any).address || (remote as any).ip || '';

        // srflx ⇄ srflx かつ 同一IP（VPN出口） → NG
        if (
          local.candidateType === 'srflx' &&
          remote.candidateType === 'srflx' &&
          localIP === remoteIP &&
          localIP === myGlobalIP
        ) {
          logs.push(`⚠ srflx同士かつ同一IP（${localIP}） → VPN疑い → NG判定`);
          isNg = true;
        }

        // host ⇄ host → NG
        if (
          local.candidateType === 'host' &&
          remote.candidateType === 'host'
        ) {
          logs.push('⚠ host同士の接続 → NG判定');
          isNg = true;
        }
      }

      for (const r of stats.values()) {
        if (r.type === 'candidate-pair') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const l = stats.get(r.localCandidateId) as any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rm = stats.get(r.remoteCandidateId) as any;
          const lt = l?.candidateType ?? 'unknown';
          const rt = rm?.candidateType ?? 'unknown';
          logs.push(`🔍 candidate-pair: ${lt} ⇄ ${rt} = ${r.state}`);
        }
      }

      if (!alreadyResolved) {
        alreadyResolved = true;
        clearInterval(pingInterval);
        if (pc.connectionState !== 'closed') pc.close();
        logs.push(isNg ? '❌ この接続は実際にはNGと判定されました' : '✅ この接続は有効です');
        resolve(logs);
      }
    };


    const checkCandidateLoop = async () => {
      const start = Date.now();
      while (!alreadyResolved && Date.now() - start < 30000) {
        const stats = await pc.getStats();
        for (const report of stats.values()) {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            await handleSuccessAndExit(report);
            return;
          }
        }
        await new Promise(res => setTimeout(res, 1000));
      }
      if (!alreadyResolved) logs.push('⚠ 30秒以内に candidate-pair: succeeded が見つかりませんでした');
    };

    pc.onconnectionstatechange = () => {
      logs.push('[WebRTC] connection state: ' + pc.connectionState);
      if (pc.connectionState === 'closed') {
        logs.push('❌ RTCPeerConnection が切断されました');
      }
    };

    pc.onsignalingstatechange = () =>
      logs.push('[WebRTC] signaling state: ' + pc.signalingState);
    pc.oniceconnectionstatechange = () =>
      logs.push('[ICE] connection state: ' + pc.iceConnectionState);
    pc.onicegatheringstatechange = () =>
      logs.push('[ICE] gathering state: ' + pc.iceGatheringState);

    dc.onopen = () => {
      logs.push('✅ DataChannel open');
      dc.send('ping');
      logs.push('📤 送信: ping');

      pingInterval = setInterval(() => {
        if (dc.readyState === 'open') {
          dc.send('ping');
          logs.push('📤 定期送信: ping');
        }
      }, 5000);

      checkCandidateLoop();

      setTimeout(async () => {
        if (alreadyResolved) return;
        logs.push(`⏱ DataChannel を ${timeoutMillisec}ミリ秒維持後に強制close（ICE未検出）`);

        const stats = await pc.getStats();
        stats.forEach((report) => {
          if (report.type === 'data-channel') {
            logs.push(`📊 DataChannel統計:\n  messagesSent: ${report.messagesSent}\n  messagesReceived: ${report.messagesReceived}\n  bytesSent: ${report.bytesSent}\n  bytesReceived: ${report.bytesReceived}`);
          }
        });

        clearInterval(pingInterval);
        if (pc.connectionState !== 'closed') {
          pc.close();
          logs.push('✅ RTCPeerConnection を close しました（timeout）');
        }
        resolve(logs);
      }, timeoutMillisec);
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
        const timeoutTimer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch('https://webrtc-answer.rita-base.com/offer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
          signal: controller.signal,
        });
        clearTimeout(timeoutTimer);

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
