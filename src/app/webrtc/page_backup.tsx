// rita-base/src/app/webrtc/page.tsx

'use client';
import React, { useState } from 'react';
import runWebRTCCheck from '@/lib/runWebRTCCheck';

export default function WebRTCCheckRunner() {
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const handleCheck = async () => {
    setRunning(true);
    const result = await runWebRTCCheck();
    setLogs(result);
    setRunning(false);
  };

  return (
    <main className="min-h-screen bg-white p-8 text-gray-800">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-blue-700 text-center">WebRTC診断（runWebRTCCheck 使用）</h1>

        <div className="text-center mb-6">
          <button
            onClick={handleCheck}
            disabled={running}
            className={`px-6 py-2 rounded-full text-white font-semibold shadow ${
              running ? 'bg-gray-400' : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            {running ? '診断中…' : '診断を実行'}
          </button>
        </div>

        <div className="bg-gray-100 rounded p-4 text-sm whitespace-pre-wrap font-mono max-h-[500px] overflow-y-auto">
          {logs.length === 0
            ? 'ログはまだありません。上のボタンで診断を実行してください。'
            : logs.join('\n')}
        </div>
      </div>
    </main>
  );
}
