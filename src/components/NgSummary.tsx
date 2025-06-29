// rita-base\components\NgSummary.tsx

// -------------------------
// NgSummary.tsx
// - NG診断項目の要約表示（理由・アクション含む）
// - CHECK_ITEMS + status + checkIsOK を元に NG な項目だけを表示
// -------------------------

import React from "react";
import { CHECK_ITEMS, CheckItem } from "@/constants/CHECK_ITEMS";

interface NgSummaryProps {
  status: string[];
  checkIsOK: (item: CheckItem, status: string[]) => boolean;
}

export const NgSummary: React.FC<NgSummaryProps> = ({ status, checkIsOK }) => {
  const ngItems = CHECK_ITEMS.filter(item => !checkIsOK(item, status));

  if (ngItems.length === 0) return null;

  return (
    <div className="border border-blue-300 bg-blue-100 rounded-xl px-4 py-6 mt-10 space-y-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">NG項目の要約</h2>
      {ngItems.map((item, idx) => (
        <div key={idx} className="bg-white border border-blue-300 p-4 rounded shadow">
          <p className="font-bold text-gray-800 mb-2">【NG項目】{item.displayName ?? item.label}</p>
          <p><span className="font-semibold text-red-600">NG理由:</span> {item.ngReason}</p>
          {item.action && (
            <p className="mt-2"><span className="font-semibold text-blue-600">今後の対応:</span> {item.action}</p>
          )}
        </div>
      ))}
    </div>
  );
};
