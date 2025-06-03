// rita-base\src\app\webrtc\page.tsx

'use client';
import WebRTCPingTest from '@/components/WebRTCPingTest';

export default function WebRTCTestPage() {
  return (
    <main className="min-h-screen bg-white p-8">
      <WebRTCPingTest />
    </main>
  );
}
