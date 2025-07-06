// runWebRTCCheck.ts（デバッグログ付き）

// ✅ 自前の型定義
type MyIceCandidateStats = RTCStats & {
  candidateType: 'host' | 'srflx' | 'relay' | 'prflx';
  ip?: string;
  address?: string;
  port?: number;
  protocol?: string;
  candidate?: string;
};

// ✅ 型ガード関数
const isIceCandidateStats = (stat: RTCStats | undefined): stat is MyIceCandidateStats => {
  return stat?.type === 'local-candidate' || stat?.type === 'remote-candidate';
};

// ✅ IP抽出関数
const extractIP = (c: MyIceCandidateStats | undefined): string => {
  if (!c) return '';
  const match = c.candidate?.match(/candidate:\d+ \d+ \w+ \d+ ([0-9.]+) \d+ typ/);
  return c.address || c.ip || (match ? match[1] : '');
};

const isPrivateIP = (ip: string): boolean =>
  /^10\./.test(ip) ||
  /^192\.168\./.test(ip) ||
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);

const runWebRTCCheck = ({
  policy = 'relay',
  myGlobalIP,
  timeoutMillisec = 30000
}: {
  policy?: 'relay' | 'all';
  myGlobalIP: string;
  timeoutMillisec?: number;
}): Promise<string[]> => {
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
    console.log(`[設定] ICEポリシー = ${policy.toUpperCase()}`);
    const pc = new RTCPeerConnection(config);
    logs.push('✅ PeerConnection を作成しました');
    console.log('✅ PeerConnection 作成済');

    // ✅ DataChannel 作成
    const channel = pc.createDataChannel("test-channel");
    channel.onopen = () => {
      logs.push("✅ DataChannel open イベントが発火しました");
      console.log("✅ DataChannel opened");
      channel.send("ping");
    };
    channel.onmessage = (event) => {
      logs.push(`📨 DataChannel メッセージ受信: ${event.data}`);
      console.log("📨 DataChannel 受信:", event.data);
    };

    // ✅ Videoトラックをリクエスト
    pc.addTransceiver("video", { direction: "recvonly" });

    const videoElement = document.createElement('video');
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.autoplay = true;
    videoElement.style.display = 'none';
    document.body.appendChild(videoElement);

    pc.ontrack = (event) => {
      logs.push('🎥 映像トラックを受信しました（ontrack 発火）');
      console.log('🎥 映像トラック ontrack 発火');
      const stream = event.streams[0];
      videoElement.srcObject = stream;
    };

    const handleSuccessAndExit = async (report: RTCIceCandidatePairStats) => {
      const stats = await pc.getStats();
      const localStat = stats.get(report.localCandidateId);
      const remoteStat = stats.get(report.remoteCandidateId);

      logs.push(`✅ WebRTC接続成功: ${report.localCandidateId} ⇄ ${report.remoteCandidateId}`);
      console.log(`✅ ICE Success: ${report.localCandidateId} ⇄ ${report.remoteCandidateId}`);

      if (!alreadyResolved) {
        alreadyResolved = true;
        if (pc.connectionState !== 'closed') pc.close();
        logs.push('✅ この接続は有効です');
        resolve(logs);
      }
    };

    pc.onconnectionstatechange = () => {
      logs.push('[WebRTC] connection state: ' + pc.connectionState);
      console.log('[WebRTC] connection state:', pc.connectionState);
    };
    pc.onsignalingstatechange = () => console.log('[Signaling]', pc.signalingState);
    pc.oniceconnectionstatechange = () => console.log('[ICE Conn]', pc.iceConnectionState);
    pc.onicegatheringstatechange = () => console.log('[ICE Gather]', pc.iceGatheringState);

    (async () => {
      try {
        logs.push('[STEP] offer 生成 開始');
        console.log('[STEP] createOffer...');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        logs.push('✅ createOffer & setLocalDescription 完了');
        console.log('✅ SDP作成完了（先頭50文字）:', offer.sdp?.slice(0, 50));

        logs.push('[STEP] /offer へ POST 実行');
        console.log('[HTTP] POST /offer 開始');
        const controller = new AbortController();
        setTimeout(() => controller.abort(), timeoutMillisec);
        const res = await fetch('https://webrtc-answer.rita-base.com/offer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`POST /offer failed: status=${res.status}`);
        logs.push('✅ POST /offer 応答あり');
        console.log('[HTTP] /offer 成功');

        const answer = await res.json();
        await pc.setRemoteDescription(answer);
        logs.push('✅ setRemoteDescription 完了');
        console.log('✅ setRemoteDescription 完了');

        const stats = await pc.getStats();
        let successFound = false;
        for (const report of stats.values()) {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            await handleSuccessAndExit(report as RTCIceCandidatePairStats);
            successFound = true;
            break;
          }
        }

        if (!successFound) {
          logs.push('❌ ICE 成功候補が見つかりませんでした');
          console.log('❌ ICE失敗: succeededなcandidate-pairなし');
          if (!alreadyResolved) {
            alreadyResolved = true;
            pc.close();
            resolve(logs);
          }
        }
      } catch (err) {
        logs.push('❌ WebRTC接続に失敗しました');
        console.error('❌ 接続エラー:', err);
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
