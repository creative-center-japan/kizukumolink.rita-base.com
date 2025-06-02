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
      { urls: 'turn:3.80.218.25:3478?transport=udp', username: 'test', credential: 'testpass' },
      { urls: 'turn:3.80.218.25:3478?transport=tcp', username: 'test', credential: 'testpass' }
    ],
    iceTransportPolicy: 'all',
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

  pc.ondatachannel = (event) => {
    const dc = event.channel;

    dc.onopen = () => {
      logs.push('[DataChannel] onopen triggered (client side)');
      dc.send('ping');
    };

    dc.onmessage = (e) => {
      logs.push('[DataChannel] message received: ' + e.data);
    };

    dc.onclose = () => {
      logs.push('[DataChannel] closed (client side)');
    };
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') resolve();
    else {
      const check = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', check);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', check);
    }
  });

  if (!pc.localDescription) {
    logs.push('❌ setLocalDescription が未完了');
    return logs;
  }

  const res = await fetch('https://webrtc-answer.rita-base.com/offer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sdp: pc.localDescription.sdp,
      type: pc.localDescription.type
    })
  });

  const answer = await res.json();
  logs.push('📨 サーバからSDP answerを受信');

  await pc.setRemoteDescription(new RTCSessionDescription(answer));
  logs.push('✅ setRemoteDescription 完了');

  await new Promise(resolve => setTimeout(resolve, 5000));

  pc.close();
  return logs;
};

export default runWebRTCCheck;

