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