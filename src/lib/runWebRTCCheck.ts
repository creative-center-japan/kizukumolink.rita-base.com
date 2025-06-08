//rita-base\src\lib\runWebRTCCheck.ts
// runWebRTCCheck.ts（GCP常駐Peer用）

const runWebRTCCheck = async (): Promise<string[]> => {
  const logs: string[] = [];

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

  const pc = new RTCPeerConnection(config);
  logs.push('[設定] WebRTC設定を適用しました');

  // 状態ログ
  pc.addEventListener('iceconnectionstatechange', () => {
    logs.push('[ICE] connection state: ' + pc.iceConnectionState);
  });
  pc.addEventListener('icegatheringstatechange', () => {
    logs.push('[ICE] gathering state: ' + pc.iceGatheringState);
  });

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    logs.push('[SDP] setLocalDescription 実行');

    // 🔁 ICE gathering 完了まで待機
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') return resolve();
      const checkState = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', checkState);
    });
    logs.push('[ICE] gathering 完了');

    // SDPを保存・表示用に出力（必要に応じてAPI送信）
    const sdp = pc.localDescription?.sdp;
    logs.push('[SDP] Offer SDP 生成完了:\n' + sdp);

    // 本番ではこのSDPを /camera-status 等で公開すればOK

  } catch (err: unknown) {
    logs.push('❌ offer生成に失敗しました');
    if (err instanceof Error) logs.push(`詳細: ${err.message}`);
    pc.close();
  }

  return logs;
};

export default runWebRTCCheck;
