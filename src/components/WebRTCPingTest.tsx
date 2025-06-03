// \src\components\WebRTCPingTest.tsx

'use client';
import React, { useEffect, useState } from 'react';

const WebRTCPingTest = () => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const run = async () => {
      const log: string[] = [];

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:3.80.218.25:3478' },
          {
            urls: 'turn:3.80.218.25:3478?transport=udp',
            username: 'test',
            credential: 'testpass',
          },
        ],
        iceTransportPolicy: 'relay',
      });

      log.push('✅ PeerConnection 作成');

      pc.addEventListener('icegatheringstatechange', () => {
        log.push(`ICE gathering state: ${pc.iceGatheringState}`);
        setLogs([...log]);
      });

      pc.addEventListener('icecandidate', (e) => {
        if (e.candidate) {
          log.push(`ICE候補: ${e.candidate.candidate}`);
        } else {
          log.push('ICE候補: 収集完了');
        }
        setLogs([...log]);
      });

      const dc = pc.createDataChannel('check', {
        ordered: true,
        negotiated: true,
        id: 0,
      });

      dc.onopen = () => {
        log.push('✅ DataChannel open');
        setLogs([...log]);
      };

      dc.onclose = () => {
        log.push('❌ DataChannel closed');
        setLogs([...log]);
      };

      dc.onerror = (e: Event) => {
        log.push(`❌ DataChannel error: ${(e as ErrorEvent).message}`);
        setLogs([...log]);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      log.push('📤 SDP offer 作成・設定完了');
      setLogs([...log]);

      // getStats で candidate-pair を定期確認
      setInterval(async () => {
        const stats = await pc.getStats();
        stats.forEach(report => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            log.push(`✅ CandidatePair Succeeded: ${report.localCandidateId} <-> ${report.remoteCandidateId}`);
            setLogs([...log]);
          }
        });
      }, 1500);
    };

    run();
  }, []);

  return (
    <div className="bg-gray-100 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">WebRTC Ping Test</h2>
      <div className="text-sm whitespace-pre-wrap font-mono text-gray-800">
        {logs.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
};

export default WebRTCPingTest;
