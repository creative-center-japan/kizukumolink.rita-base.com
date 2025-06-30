// rita-base\src\app\page.tsx

'use client';

const FORCE_ALL_NG = false; // ← NGテストしたいとき true に 戻すときは false

import React, { useState, useEffect } from 'react';
import { runDiagnosis } from "@/lib/runDiagnosis";
import { ResultCard } from "@/components/ResultCard";
import { generateReportText } from "@/lib/utils";
import { NgSummary } from "@/components/NgSummary";
import { DetailModal } from "@/components/DetailModal";
import { CHECK_ITEMS } from "@/constants/CHECK_ITEMS";

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
  if (FORCE_ALL_NG) return false;

  const ipLog = status.find(log =>
    log.startsWith("外部IP:") ||
    log.startsWith("🌐 外部IP（補完）:") ||
    log.startsWith("🔸外部IP:")
  );
  const ip = ipLog?.split(/[:：]\s*/)[1]?.trim() ?? "";

  const isPrivateIP = (ip: string) =>
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);

  // 🔍 VPNチェック（host候補の中にグローバルIPが存在したら NG）
  const hostLines = status.filter(log => log.includes('typ host'));
  const suspiciousGlobalHosts = hostLines.filter(line =>
    /candidate:.* ([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+) \d+ typ host/.test(line) &&
    !/\.local/.test(line) &&
    !isPrivateIP(RegExp.$1) &&
    !/^127\./.test(RegExp.$1)
  );

  // VPN経由の可能性があるなら TURN / P2P どちらも NG にする
  const isVPN = suspiciousGlobalHosts.length > 0;

  if (item.label === 'TURN接続確認') {
    return !isVPN && status.some(log => log.includes('【 接続形態 】TURNリレー（中継）'));
  }

  if (item.label === 'P2P接続確認') {
    return !isVPN && status.some(log => log.includes('【 接続形態 】P2P（直接）'));
  }

  if (item.label === 'ip_check') {
    return !!ip && /^[0-9.]+$/.test(ip) &&
      !/^0\.0\.0\.0$/.test(ip) &&
      !/^127\./.test(ip) &&
      !isPrivateIP(ip);
  }

  if (item.label === 'サービスへの通信確認') {
    return status.some(log =>
      log.includes("サービスへの通信確認: OK") ||
      log.includes("favicon.ico → OK")
    );
  }

  return status.some(log =>
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

          <p className="text-center text-sm sm:text-base text-gray-700 mb-6 font-semibold leading-relaxed">
            このWeb診断ではお客様ご利用のネットワーク環境がキヅクモカメラと通信できるかを確認します。<br />
            カメラを設置する場所と映像を見る場所の両方で実施してください。<br />
            <span className="block text-xs text-gray-500 font-bold mt-2">
              本ツールはWebRTC等の接続方式を含むネットワーク診断の簡易補助を目的としています。<br />
              診断結果は通信環境・NAT構成・セキュリティ機器設定などにより異なる可能性があり、<br />
              結果の正確性・完全性を保証するものではありません。<br />
              <span className="underline">最終的なご利用可否は、実機を用いた環境テストを推奨いたします。</span>
            </span>
          </p>

          {diagnosed && (
            <div className="grid grid-cols-[repeat(auto-fit,_minmax(280px,_1fr))] gap-4 mb-6">
              {CHECK_ITEMS.map((item, idx) => (
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
                className="bg-blue-800 hover:bg-blue-900 transition text-white px-6 py-2 rounded-full text-lg"
              >診断開始</button>
            )}
            {loading && !diagnosed && (
              <button
                onClick={() => setLoading(false)}
                className="bg-blue-800 hover:bg-blue-900 transition text-white px-6 py-2 rounded-full text-lg"
              >キャンセル</button>
            )}
            {diagnosed && (
              <>
                <button
                  onClick={() => runDiagnosis(setStatus, setLoading, setDiagnosed, setPhase)}
                  className="bg-blue-800 hover:bg-blue-900 transition text-white px-6 py-2 rounded-full text-lg"
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
                  className="bg-blue-800 hover:bg-blue-900 transition text-white px-6 py-2 rounded-full text-lg"
                >結果をダウンロード</button>
              </>
            )}
          </div>

          {loading && !diagnosed && (
            <div className="bg-[#1b2a3a] text-blue-100 rounded-xl p-4 sm:p-6 text-sm sm:text-base space-y-4 mb-10 font-semibold">
              <p>診断は1分ほどかかります。以下のステップで進行中です：</p>
              <ul className="space-y-1">
                <li className={`${phase === 1 ? "text-blue-300 animate-pulse" : phase! > 1 ? "text-green-300" : "text-gray-300"}`}>
                  フェーズ 1：キヅクモサービス疏通確認
                </li>
                <li className={`${phase === 2 ? "text-blue-300 animate-pulse" : phase! > 2 ? "text-green-300" : "text-gray-300"}`}>
                  フェーズ 2：ポート疏通確認
                </li>
                <li className={`${phase === 3 ? "text-blue-300 animate-pulse" : diagnosed ? "text-green-300" : "text-gray-300"}`}>
                  フェーズ 3：映像通信確認
                </li>
              </ul>
            </div>
          )}

          {diagnosed && <NgSummary status={status} checkIsOK={checkIsOK} />}
          <DetailModal showDetail={showDetail} setShowDetail={setShowDetail} />
        </div>
      </div>
    </main>
  );
}
