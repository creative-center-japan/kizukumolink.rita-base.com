// rita-base/src/lib/runWebRTCCheck.ts

// src/lib/runWebRTCCheck.ts

import { v4 as uuidv4 } from 'uuid';

const runWebRTCCheck = async (statusCallback: (log: string) => void): Promise<void> => {
  const pcId = uuidv4().slice(0, 8);
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:3.80.218.25:3478' },
      { urls: 'turn:3.80.218.25:3478?transport=udp', username: 'test', credential: 'testpass' },
      { urls: 'turn:3.80.218.25:3478?transport=tcp', username: 'test', credential: 'testpass' }
    ],
    iceTransportPolicy: 'relay',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: 0
  });

  const dc = pc.createDataChannel("test-channel");

  dc.onopen = () => {
    console.log(`[DataChannel] ✅ open (${pcId})`);
    dc.send("ping");
  };

  dc.onmessage = (event) => {
    console.log(`[DataChannel] 📨 received: ${event.data} (${pcId})`);
    dc.close();
  };

  dc.onclose = () => {
    console.log(`[DataChannel] ❌ closed (${pcId})`);
  };

  pc.oniceconnectionstatechange = () => {
    console.log(`[ICE] state: ${pc.iceConnectionState} (${pcId})`);
  };

  pc.onsignalingstatechange = () => {
    console.log(`[Signal] state: ${pc.signalingState} (${pcId})`);
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log(`[ICE] candidate: ${event.candidate.candidate} (${pcId})`);
    } else {
      console.log(`[ICE] candidate gathering done (${pcId})`);
    }
  };

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log(`[OFFER] created and setLocalDescription done (${pcId})`);

    // Poll until ICE gathering is complete
    await new Promise<void>((resolve) => {
      const checkIce = () => {
        if (pc.iceGatheringState === "complete") {
          resolve();
        } else {
          setTimeout(checkIce, 100);
        }
      };
      checkIce();
    });

    // Send offer to server
    const response = await fetch("https://webrtc-answer.rita-base.com/offer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ sdp: pc.localDescription?.sdp })
    });
    const { sdp: answerSDP } = await response.json();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSDP });
    console.log(`[ANSWER] received and setRemoteDescription done (${pcId})`);

    // 最終状態確認
    setTimeout(() => {
      console.log(`[FINAL] ICE: ${pc.iceConnectionState}, Conn: ${pc.connectionState}`);
      if (
        pc.iceConnectionState === 'disconnected' ||
        pc.connectionState === 'failed'
      ) {
        statusCallback("NG: 接続確立後に切断されました。セッション保持に失敗しています。");
      } else {
        statusCallback("OK: WebRTC接続は成功しました。");
      }
    }, 3000);
  } catch (err: any) {
    console.error("[ERROR]", err);
    statusCallback("NG: offer/post/answer処理中にエラーが発生しました");
  }
};

export default runWebRTCCheck;
