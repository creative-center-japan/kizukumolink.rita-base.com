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
  : CHECK_ITEMS.filter(item => item.label !== "WebRTC接続成功" && item.label !== "リレーサーバの利用");

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
  if (item.label === 'WebRTC接続成功') {
    return status.some(log => log.startsWith('✅ WebRTC接続成功'));
  }

  if (item.label === '接続方式') {
    return status.some(log => log.startsWith('【 接続方式候補 】'));
  }

  const logsForItem = status.filter(log => log.includes(item.keyword));

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
    <div>
      <main className="min-h-screen overflow-y-auto bg-gradient-to-br from-blue-50 to-blue-100 text-gray-900 px-4 sm:px-6 pt-4 sm:pt-8 pb-12 sm:pb-24 text-base sm:text-lg">
        <div className="overflow-hidden w-full">
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }} className="transition-transform duration-300 w-full">
            <div className="max-w-[96%] mx-auto">
              <h1 className="text-3xl sm:text-4xl font-bold text-blue-800 text-center mb-6 tracking-wide">
                キヅクモサービス接続診断ツール
              </h1>
              <p className="text-center text-sm sm:text-base md:text-lg text-gray-700 mb-6 font-semibold leading-relaxed">
                このWeb診断ではお客様ご利用のネットワーク環境がキヅクモカメラと通信できるかを確認します。<br />
                カメラを設置する場所と映像を見る場所の両方で実施してください。<br />
                <span className="block text-xs sm:text-sm text-gray-500 font-bold mt-2">
                  本ツールはWebRTC等の接続方式を含むネットワーク診断の簡易補助を目的としています。<br />
                  診断結果は通信環境・NAT構成・セキュリティ機器設定などにより異なる可能性があり、<br />
                  結果の正確性・完全性を保証するものではありません。<br />
                  <span className="underline">最終的なご利用可否は、実機を用いた環境テストを推奨いたします。</span>
                </span>
              </p>
              {diagnosed && (
                <div className="grid grid-cols-[repeat(auto-fit,_minmax(280px,_1fr))] gap-4 px-2 sm:px-4 mx-auto max-w-[96%] mb-4">
                  {filteredCheckItems.map((item: CheckItem, idx: number) => (
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
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {!loading && !diagnosed && (
                  <button
                    onClick={() => runDiagnosis(setStatus, setLoading, setDiagnosed, setPhase)}
                    className="w-full sm:w-auto max-w-[200px] h-[44px] px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-full font-semibold shadow text-base sm:text-lg text-center whitespace-nowrap"
                  >診断開始</button>
                )}
                {loading && !diagnosed && (
                  <button
                    onClick={() => {
                      setLoading(false);
                      setStatus([]);
                    }}
                    className="w-full sm:w-auto max-w-[200px] h-[44px] px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-full font-semibold shadow text-base sm:text-lg text-center whitespace-nowrap"
                  >キャンセル</button>
                )}
              </div>
              {diagnosed && (
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  <button
                    onClick={() => runDiagnosis(setStatus, setLoading, setDiagnosed, setPhase)}
                    className="w-full sm:w-auto max-w-[200px] h-[44px] px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-full font-semibold shadow text-base sm:text-lg text-center whitespace-nowrap"
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
                    className="w-full sm:w-auto max-w-[200px] h-[44px] px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-full font-semibold shadow text-base sm:text-lg text-center whitespace-nowrap"
                  >結果をダウンロード</button>
                </div>
              )}
              {loading && !diagnosed && (
                <div className="bg-[#1b2a3a] text-blue-100 rounded-xl p-4 sm:p-6 text-sm sm:text-base space-y-4 mb-10 font-semibold">
                  <p>診断は1分ほどかかります。以下のステップで進行中です：</p>
                  <ul className="space-y-1">
                    <li className={`${phase === 1 ? "text-blue-300 animate-pulse" : (phase ?? 0) > 1 ? "text-green-300" : "text-gray-300"}`}>
                      フェーズ 1：キヅクモサービス疎通確認 - {(phase ?? 0) > 1 ? "完了" : phase === 1 ? "実行中" : "未実行"} -
                    </li>
                    <li className={`${phase === 2 ? "text-blue-300 animate-pulse" : (phase ?? 0) > 2 ? "text-green-300" : "text-gray-300"}`}>
                      フェーズ 2：キヅクモサービス利用通信確認 - {(phase ?? 0) > 2 ? "完了" : phase === 2 ? "実行中" : "未実行"} -
                    </li>
                    <li className={`${phase === 3 && !diagnosed ? "text-blue-300 animate-pulse" : diagnosed ? "text-green-300" : "text-gray-300"}`}>
                      フェーズ 3：映像通信確認 - {diagnosed ? "完了" : phase === 3 ? "実行中" : "未実行"} -
                    </li>
                  </ul>
                </div>
              )}
              {diagnosed && (
                <NgSummary status={status} checkIsOK={checkIsOK} />
              )}
              <DetailModal showDetail={showDetail} setShowDetail={setShowDetail} />
              <div className="text-center mt-12">
                <Link href="/privacy">
                  <span className="text-sm text-blue-700 underline">プライバシーポリシー</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
