// rita-base\components\ResultCard.tsx

// -------------------------
// ResultCard.tsx
// - 各診断項目の「カードUIコンポーネント」
// - 判定状態やNG理由の表示を担当
// - CHECK_ITEMS から受け取った定義に基づき出力
// -------------------------

// rita-base\components\ResultCard.tsx

import React from "react";
import { CHECK_ITEMS } from "@/constants/CHECK_ITEMS";

interface ResultCardProps {
  item: (typeof CHECK_ITEMS)[number];
  idx: number;
  status: string[];
  checkIsOK: (item: (typeof CHECK_ITEMS)[number], status: string[]) => boolean;
  setShowDetail: (label: string | null) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ item, idx, status, checkIsOK, setShowDetail }) => {
  // ✅ フィルタせず全ログをそのまま checkIsOK に渡す
  const isOK = checkIsOK(item, status);

  const ipLog = status.find(log =>
    log.startsWith("外部IP:") ||
    log.startsWith("🌐 外部IP（補完）:") ||
    log.startsWith("🔸外部IP:")
  );
  const ipAddress = ipLog?.split(/[:：]\s*/)[1]?.trim() ?? '';

  return (
    <div
      key={idx}
      className="relative bg-white text-gray-800 border border-gray-200 shadow-md w-full max-w-[360px] p-4 rounded-xl"
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">{item.label}</h3>
        <button
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold hover:bg-blue-200"
          title={item.tooltip}
          onClick={() => setShowDetail(item.label)}
        >
          ？
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-1">{item.description}</p>

      <p className="text-3xl font-bold text-center">
        {item.label === 'ご利用IPアドレス' ? (
          <span className={isOK ? 'text-emerald-500' : 'text-rose-500'}>
            {ipAddress || '取得失敗'}
          </span>
        ) : (
          <span className={isOK ? 'text-emerald-500' : 'text-rose-500'}>
            {isOK ? 'OK' : 'NG'}
          </span>
        )}
      </p>

      {item.label === 'WebRTC接続成功' && (
        <p className="text-sm text-blue-700 text-center mt-1">
          {status.find(log => log.includes("【接続方式】")) || "【接続方式】不明"}
          <br />
          {status.find(log => log.includes("接続形態:"))}
        </p>
      )}

    </div>
  );
};

