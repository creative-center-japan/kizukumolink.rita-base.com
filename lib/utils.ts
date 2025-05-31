// rita-base\lib\utils.ts

// -------------------------
// utils.ts
// - generateReportText(): ログ配列をテキスト形式に変換
// - ダウンロード用txtファイルの出力処理に使用
// -------------------------

export function generateReportText(logs: string[]): string {
  const lines: string[] = [];

  // ヘッダー情報（IP, 日時など）
  const header = logs.filter(log =>
    log.startsWith("📅") ||
    log.startsWith("🔸外部IP:") ||
    log.startsWith("🔸サービスへの通信確認")
  );
  lines.push(...header);

  // TCP/UDPポート
  const tcp = logs.filter(log => log.startsWith("ポート確認: TCP"));
  const udp = logs.filter(log => log.startsWith("ポート確認: UDP"));
  if (tcp.length || udp.length) {
    lines.push("🔸 TCPポート確認:");
    lines.push(...tcp);
    lines.push("🔸 UDPポート確認:");
    lines.push(...udp);
  }

  // WebRTCログ
  const webrtc = logs.filter(log =>
    log.startsWith("[設定]") || log.startsWith("🔧") || log.startsWith("📝") ||
    log.startsWith("📥") || log.startsWith("ICE") || log.startsWith("✅") ||
    log.startsWith("⚠️") || log.startsWith("❌") || log.startsWith("📤") ||
    log.startsWith("candidate-pair") || log.startsWith("📊") ||
    log.startsWith("全体接続状態")
  );
  lines.push("🔸 WebRTCログ");
  lines.push(...webrtc);

  return lines.join('\n');
}
