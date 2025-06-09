// runWebRTCCheck.ts - 最新版（KeepAlive分離 + candidateペア検出 + DataChannel応答 + 明示close）

const runWebRTCCheck = async (): Promise<string[]> => {
  const logs: string[] = [];
  const statsLog: string[] = [];

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

  // DataChannel作成
  const dc = pc.createDataChannel('test-channel');

  let isPongReceived = false;
  dc.onopen = () => {
    logs.push('✅ DataChannel open');
    dc.send('ping');
    logs.push('📤 ping送信');
  };

  dc.onmessage = (event) => {
    logs.push(`📨 受信: ${event.data}`);
    if (event.data === 'pong') {
      isPongReceived = true;
      logs.push('✅ pong応答を確認');
    }
  };

  dc.onclose = () => {
    logs.push('❌ DataChannel closed');
  };

  dc.onerror = (e) => {
    logs.push(`⚠ DataChannel error: ${(e as ErrorEvent).message}`);
  };

  try {
    logs.push('[STEP] /camera-status からSDP取得開始');
    const res = await fetch('https://webrtc-answer.rita-base.com/camera-status');
    if (!res.ok) throw new Error(`status=${res.status}`);
    const offer = await res.json();
    logs.push('✅ /camera-statusからSDP取得完了');

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    logs.push('✅ setRemoteDescription 完了');

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    logs.push('✅ setLocalDescription 完了');

    // 15秒待機してから候補ペア確認
    await new Promise(resolve => setTimeout(resolve, 15000));
    const stats = await pc.getStats();
    stats.forEach(report => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        statsLog.push(
          `✅ 候補成功: ${report.localCandidateId} ⇄ ${report.remoteCandidateId} ` +
          `[writable=${report.writable}, nominated=${report.nominated}]`
        );
      }
    });

    if (statsLog.length === 0) {
      logs.push('⚠ 候補ペアがsucceeded状態に到達していません');
    } else {
      logs.push(...statsLog);
    }

  } catch (err) {
    logs.push('❌ WebRTC接続に失敗しました');
    if (err instanceof Error) {
      logs.push(`❗詳細: ${err.message}`);
    } else {
      logs.push(`❗詳細(unknown): ${JSON.stringify(err)}`);
    }
  } finally {
    pc.close();
    logs.push('🔚 RTCPeerConnectionを明示的にcloseしました');
  }

  return logs;
};

export default runWebRTCCheck;
