// rita-base\components\DetailModal.tsx

// -------------------------
// DetailModal.tsx
// - 各診断項目の詳細表示用モーダル
// - showDetail の状態があるときに対応する詳細情報を表示
// -------------------------

import React from "react";
import { CHECK_ITEMS } from "@/constants/CHECK_ITEMS";

interface DetailModalProps {
  showDetail: string | null;
  setShowDetail: (label: string | null) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ showDetail, setShowDetail }) => {
  const item = CHECK_ITEMS.find(i => i.label === showDetail);

  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white border border-gray-300 rounded-xl p-6 sm:p-8 shadow-xl text-gray-900 max-w-lg w-full">
        <h2 className="text-xl font-bold text-blue-700 mb-4">
          {item.displayName ?? item.label}
        </h2>

        <p className="text-base text-gray-700 whitespace-pre-wrap mb-4">
          {item.detail}
        </p>

        <div className="text-right">
          <button
            onClick={() => setShowDetail(null)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-base"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
