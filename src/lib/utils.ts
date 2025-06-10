// rita-base\lib\utils.ts

// -------------------------
// utils.ts
// - generateReportText(): ログ配列をテキスト形式に変換
// - ダウンロード用txtファイルの出力処理に使用
// -------------------------

export function generateReportText(logs: string[]): string {
  return logs.join('\n');
}
