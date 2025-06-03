// \src\components\WebRTCPingTest.tsx

'use client';
import React, { useState, useEffect } from 'react';

export default function WebRTCPingTest() {
    const [status, setStatus] = useState('未接続');
    const [log, setLog] = useState<string[]>([]);
    const [rtt, setRtt] = useState<number | null>(null);

    useEffect(() => {
        let startTime: number;

        const pc = new RTCPeerConnection({
            iceServers: [
                {
                    urls: [
                        'turn:3.80.218.25:3478?transport=udp'
                    ],
                    username: 'test',
                    credential: 'testpass',
                },
            ],
            iceTransportPolicy: 'all',
        });

        const channel = pc.createDataChannel('ping-test');

        channel.onopen = () => {
            setStatus('接続成功！Ping送信中...');
            startTime = Date.now();
            channel.send('ping');
            setLog((prev) => [...prev, '📤 ping を送信しました']);
        };

        channel.onmessage = (event) => {
            setLog((prev) => [...prev, `📨 受信メッセージ: ${event.data}`]);
            if (event.data === 'pong') {
                const endTime = Date.now();
                const roundTripTime = endTime - startTime;
                setRtt(roundTripTime);
                setStatus('通信成功（RTT計測完了）');
                setLog((prev) => [
                    ...prev,
                    `✅ pong応答を確認、RTT=${roundTripTime}ms`,
                    '【判定】OK'
                ]);
            }
        };

        channel.onclose = () => setLog((prev) => [...prev, '❌ DataChannel closed']);
        channel.onerror = (e) =>
            setLog((prev) => [...prev, `⚠ DataChannel error: ${(e as ErrorEvent).message}`]);

        pc.onicecandidate = (e) => {
            const candidate = e.candidate?.candidate;
            if (candidate) {
                setLog((prev) => [...prev, `ICE候補: ${candidate}`]);
            } else {
                setLog((prev) => [...prev, 'ICE候補収集完了']);
            }
        };

        pc.createOffer().then((offer) => {
            pc.setLocalDescription(offer);
        });

        return () => {
            channel.close();
            pc.close();
        };
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">WebRTC Pingテスト</h1>
            <p>状態: {status}</p>
            {rtt !== null && <p>RTT: {rtt} ms</p>}
            <div className="mt-4">
                <h2 className="text-lg font-semibold">ICEログ</h2>
                <ul className="text-sm text-gray-700 bg-gray-100 p-2 rounded max-h-[200px] overflow-y-auto">
                    {log.map((l, i) => (
                        <li key={i}>{l}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
