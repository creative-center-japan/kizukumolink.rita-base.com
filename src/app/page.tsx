// -------------------------
// rita-base\src\app\page.tsx
// - メイン画面：診断UIの表示・ボタン操作・ステータス管理を行う
// - useStateで各状態を制御し、lib/components/constants から機能分離したモジュールを呼び出す
// -------------------------

'use client';

import React, { useState, useEffect } from 'react';
import { runDiagnosis } from "@/lib/runDiagnosis";
import { ResultCard } from "@/components/ResultCard";
import { generateReportText } from "@/lib/utils";
import { NgSummary } from "@/components/NgSummary";
import { DetailModal } from "@/components/DetailModal";
import { CHECK_ITEMS, CheckItem } from "@/constants/CHECK_ITEMS";
import Link from "next/link";

const ENABLE_WEBRTC = true;
const filteredCheckItems = ENABLE_WEBRTC
  ? CHECK_ITEMS
  : CHECK_ITEMS.filter(item => item.label !== "WebRTC接続成功" && item.label !== "接続方式");

function useScaleFactor() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const updateScale = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (width < 768) {
        const neededHeight = 720;
        const factor = Math.min(1, height / neededHeight);
        setScale(Number(factor.toFixed(2)));
      } else {
        setScale(1);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);
  return scale;
}

const checkIsOK = (item: (typeof CHECK_ITEMS)[number], status: string[]) => {
  const logsForItem = status.filter(log => log.includes(item.keyword));

  if (item.label === 'WebRTC接続成功') {
    return logsForItem.some(log => log.startsWith('✅ WebRTC接続成功'));
  }

  if (item.label === '接続方式') {
    return logsForItem.some(log => log.includes('【 接続方式候補 】'));
  }

  if (item.label === 'ご利用IPアドレス') {
    const ipLog = logsForItem.find(log =>
      log.startsWith("外部IP:") ||
      log.startsWith("🌐 外部IP（補完）:") ||
      log.startsWith("🔸外部IP:")
    );
    const ip = ipLog?.split(/[:：]\s*/)[1]?.trim() ?? "";
    return !!ip && /^[0-9.]+$/.test(ip) &&
      !/^0\.0\.0\.0$/.test(ip) &&
      !/^127\./.test(ip) &&
      !/^10\./.test(ip) &&
      !/^192\.168\./.test(ip) &&
      !/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);
  }

  if (item.label === 'サービスへの通信確認') {
    return logsForItem.some(log =>
      log.includes("サービスへの通信確認: OK") ||
      log.includes("favicon.ico → OK")
    );
  }

  return logsForItem.some(log =>
    log.includes("OK") || log.includes("成功") || log.includes("応答あり")
  );
};

export default function Home() {
  const scale = useScaleFactor();
  const [status, setStatus] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [diagnosed, setDiagnosed] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [phase, setPhase] = useState<1 | 2 | 3 | null>(null);

  return (
    <main className="min-h-screen bg-blue-50 text-gray-900 px-4 pt-6 pb-20">
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }} className="transition-transform duration-300">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-blue-800 text-center mb-6">キヅクモサービス接続診断ツール</h1>

          {diagnosed && (
            <div className="grid grid-cols-[repeat(auto-fit,_minmax(280px,_1fr))] gap-4 mb-6">
              {filteredCheckItems.map((item, idx) => (
                <ResultCard
                  key={idx}
                  item={item}
                  idx={idx}
                  status={status}
                  checkIsOK={checkIsOK}
                  setShowDetail={setShowDetail}
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {!loading && !diagnosed && (
              <button
                onClick={() => runDiagnosis(setStatus, setLoading, setDiagnosed, setPhase)}
                className="bg-blue-800 text-white px-6 py-2 rounded-full text-lg"
              >診断開始</button>
            )}
            {loading && (
              <button
                onClick={() => setLoading(false)}
                className="bg-blue-800 text-white px-6 py-2 rounded-full text-lg"
              >キャンセル</button>
            )}
            {diagnosed && (
              <>
                <button
                  onClick={() => runDiagnosis(setStatus, setLoading, setDiagnosed, setPhase)}
                  className="bg-blue-800 text-white px-6 py-2 rounded-full text-lg"
                >再診断</button>
                <button
                  onClick={() => {
                    const text = generateReportText(status);
                    const blob = new Blob([text], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `ritabase_check_${new Date().toISOString().slice(0, 10)}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="bg-blue-800 text-white px-6 py-2 rounded-full text-lg"
                >結果をダウンロード</button>
              </>
            )}
          </div>

          {diagnosed && <NgSummary status={status} checkIsOK={checkIsOK} />}
          <DetailModal showDetail={showDetail} setShowDetail={setShowDetail} />

          <div className="text-center mt-8">
            <Link href="/privacy">
              <span className="text-sm text-blue-700 underline hover:text-blue-500">プライバシーポリシー</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
