// rita-base\src\lib\runWebRTCCheck.ts

// runWebRTCCheck.ts（常駐PeerのSDPを再利用して接続を確立）

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

  // イベントログ
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

  // offer取得（GCP側のSDP）
  let remoteOffer: RTCSessionDescriptionInit;
  try {
    const res = await fetch('https://webrtc-answer.rita-base.com/camera-status');
    remoteOffer = await res.json();
    logs.push('📨 GCP側のSDP取得成功');
  } catch (e) {
    logs.push('❌ GCP側SDP取得に失敗');
    return logs;
  }

  await pc.setRemoteDescription(new RTCSessionDescription(remoteOffer));
  logs.push('✅ setRemoteDescription 完了');

  const dc = pc.createDataChannel('check');

  dc.onopen = () => {
    logs.push('✅ DataChannel open');
    dc.send('ping');
    logs.push('📤 送信: ping');
  };

  dc.onmessage = (event) => {
    logs.push(`📨 受信: ${event.data}`);
    logs.push('✅ DataChannel 応答確認完了');
    setTimeout(() => {
      logs.push('⏱ DataChannel を60秒維持後に close 実行');
      if (pc.connectionState !== 'closed') {
        pc.close();
        logs.push('✅ RTCPeerConnection を close しました');
      }
    }, 60000);
  };

  dc.onclose = () => logs.push('❌ DataChannel closed');
  dc.onerror = (e) => logs.push(`⚠ DataChannel error: ${(e as ErrorEvent).message}`);

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  logs.push('✅ createAnswer → setLocalDescription 完了');

  return logs;
};

export default runWebRTCCheck;
