// \src\components\WebRTCPingTest.tsx

'use client';
import { useEffect, useState } from 'react';

export default function WebRTCPingTest() {
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

            const dc = pc.createDataChannel('check', {
                ordered: true,
                negotiated: true,
                id: 0,
            });

            dc.onopen = () => {
                log.push('✅ DataChannel open');
                dc.send('ping');
                log.push('📤 クライアントから初ping送信');
            };

            dc.onmessage = (e) => {
                log.push(`📨 受信: ${e.data}`);
            };

            dc.onerror = (e: RTCErrorEvent) => {
                log.push(`❌ DataChannel error: ${e.error.message}`);
            };


            pc.addEventListener('icecandidate', (e) => {
                log.push('ICE候補: ' + (e.candidate?.candidate ?? '収集完了'));
            });

            pc.addEventListener('icegatheringstatechange', () => {
                log.push('ICE gathering state: ' + pc.iceGatheringState);
            });

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            await new Promise<void>((resolve) => {
                if (pc.iceGatheringState === 'complete') resolve();
                else {
                    pc.addEventListener('icegatheringstatechange', () => {
                        if (pc.iceGatheringState === 'complete') resolve();
                    });
                }
            });

            // ここでログ送信も可能（例: fetch('/offer')）

            // 3秒後に getStats 実行
            setTimeout(async () => {
                const stats = await pc.getStats();
                stats.forEach((report) => {
                    if (report.type === 'candidate-pair') {
                        log.push(`[candidate-pair] id=${report.id}, state=${report.state}, nominated=${report.nominated}`);
                    }
                });

                setLogs([...log]);
                pc.close();
            }, 3000);
        };

        run();
    }, []);

    return (
        <div className="text-sm whitespace-pre-wrap bg-gray-100 p-4 rounded">
            {logs.map((line, idx) => (
                <div key={idx}>{line}</div>
            ))}
        </div>
    );
}
