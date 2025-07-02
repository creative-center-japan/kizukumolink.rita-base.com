// runWebRTCCheck.ts（VPN判定強化・映像受信診断付き完全版）

/* eslint-disable @typescript-eslint/no-explicit-any */

const runWebRTCCheck = ({ policy = 'relay', myGlobalIP }: { policy?: 'relay' | 'all'; myGlobalIP: string }): Promise<string[]> => {
  return new Promise((resolve) => {
    const logs: string[] = [];
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
    logs.push('✅ PeerConnection を作成しました');

    const videoElement = document.createElement('video');
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.autoplay = true;
    videoElement.style.display = 'none';
    document.body.appendChild(videoElement);

    pc.ontrack = (event) => {
      logs.push('🎥 映像トラックを受信しました（ontrack 発火）');
      const stream = event.streams[0];
      videoElement.srcObject = stream;
    };

    const extractIP = (c: any): string => {
      if (!c) return '';
      return c.address || c.ip || (() => {
        const match = c.candidate?.match(/candidate:\d+ \d+ [a-zA-Z]+ \d+ ([0-9.]+) \d+ typ/);
        return match ? match[1] : '';
      })();
    };

    const isPrivateIP = (ip: string): boolean => {
      return /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);
    };

    const handleSuccessAndExit = async (report: RTCIceCandidatePairStats) => {
      const stats = await pc.getStats();
      const local = stats.get(report.localCandidateId) as any;
      const remote = stats.get(report.remoteCandidateId) as any;

      logs.push(`✅ WebRTC接続成功: ${report.localCandidateId} ⇄ ${report.remoteCandidateId} [nominated=${report.nominated}]`);
      let isNg = false;

      if (local && remote) {
        logs.push(`【 接続方式候補 】${local.candidateType}`);
        logs.push(`【 接続形態 】${local.candidateType === 'relay' ? 'TURNリレー（中継）' : 'P2P（直接）'}`);

        const localIP = extractIP(local);
        const remoteIP = extractIP(remote);
        logs.push(`🧪 判定用: localIP=${localIP}, remoteIP=${remoteIP}, myGlobalIP=${myGlobalIP}`);

        if (local.candidateType === 'host' && remote.candidateType === 'host') {
          logs.push('❌ nominatedペアが host ⇄ host → ローカル通信判定 → NG');
          isNg = true;
        }

        if (remote.candidateType === 'srflx' && remoteIP === myGlobalIP) {
          logs.push('❌ remote候補にVPN出口IPが出現 → 自己ループ/NAT崩壊疑い → NG');
          isNg = true;
        }

        if ((local.candidateType === 'srflx' && isPrivateIP(localIP)) || (remote.candidateType === 'srflx' && isPrivateIP(remoteIP))) {
          logs.push('❌ srflx候補に private IP が含まれる → 異常なSTUN応答 → NG');
          isNg = true;
        }

        if (local.candidateType === 'host' && localIP && !isPrivateIP(localIP) && !/^127\./.test(localIP)) {
          logs.push(`❌ host候補にグローバルIP（${localIP}）→ 異常構成/VPN疑い → NG`);
          isNg = true;
        }

        if (local.candidateType === 'srflx' && localIP !== myGlobalIP) {
          logs.push(`🟡 local srflx IP が VPN出口と異なる → VPN疑い（ログのみ）`);
        }
      }

      for (const r of stats.values()) {
        if (r.type === 'candidate-pair') {
          const l = stats.get(r.localCandidateId) as any;
          const rm = stats.get(r.remoteCandidateId) as any;
          const lt = l?.candidateType ?? 'unknown';
          const rt = rm?.candidateType ?? 'unknown';
          logs.push(`🔍 candidate-pair: ${lt} ⇄ ${rt} = ${r.state}`);
        }
      }

      if (!alreadyResolved) {
        alreadyResolved = true;
        if (pc.connectionState !== 'closed') pc.close();
        logs.push(isNg ? '❌ この接続は実際にはNGと判定されました' : '✅ この接続は有効です');
        resolve(logs);
      }
    };

    pc.onconnectionstatechange = () => {
      logs.push('[WebRTC] connection state: ' + pc.connectionState);
      if (pc.connectionState === 'closed') {
        logs.push('❌ RTCPeerConnection が切断されました');
      }
    };

    pc.onsignalingstatechange = () => logs.push('[WebRTC] signaling state: ' + pc.signalingState);
    pc.oniceconnectionstatechange = () => logs.push('[ICE] connection state: ' + pc.iceConnectionState);
    pc.onicegatheringstatechange = () => logs.push('[ICE] gathering state: ' + pc.iceGatheringState);

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
