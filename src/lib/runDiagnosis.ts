// rita-base\lib\runDiagnosis.ts

// -------------------------
// runDiagnosis.ts
// - フェーズ1〜3の診断ロジックを統括
// - 各状態変更(setter)を外部から受け取り実行
// - runWebRTCCheckを内包して総合診断を完成
// -------------------------

import { runWebRTCCheck } from "@/lib/runWebRTCCheck";

export const runDiagnosis = async (
  setStatus: (logs: string[]) => void,
  setLoading: (val: boolean) => void,
  setDiagnosed: (val: boolean) => void,
  setPhase: (val: 1 | 2 | 3 | null) => void
): Promise<void> => {
  setLoading(true);
  setDiagnosed(false);
  setPhase(1);
  const logs: string[] = [];

  // フェーズ1：IPとFQDNチェック
  let ip = "取得失敗";
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    ip = data.ip;
  } catch {
    ip = "取得失敗";
  }

  let fqdnResult = "NG";
  try {
    const res = await fetch("/api/fqdncheck");
    const result = await res.text();
    fqdnResult = result.startsWith("OK")
      ? `OK (Alarm.com 接続成功 - status: 200)`
      : `NG (${result})`;
  } catch (err) {
    fqdnResult = `NG (エラー: ${(err as Error).message})`;
  }

  logs.push(`📅 実行日時: ${new Date().toLocaleString("ja-JP", { hour12: false })}`);
  logs.push(`🔸外部IP: ${ip}`);
  logs.push(`🔸サービスへの通信確認: ${fqdnResult}`);

  setStatus([...logs]);
  setPhase(2);

  // フェーズ2：ポート確認
  try {
    const res = await fetch("https://check-api.rita-base.com/check-json");
    const data = await res.json();

    logs.push("🔸 TCPポート確認:");
    for (const [port, result] of Object.entries(data.tcp)) {
      logs.push(`ポート確認: TCP ${port} → ${result === "success" ? "成功" : "失敗"}`);
    }

    logs.push("🔸 UDPポート確認:");
    for (const [port, result] of Object.entries(data.udp)) {
      logs.push(`ポート確認: UDP ${port} → ${result === "success" ? "応答あり" : "応答なし"}`);
    }

    if (data.failed_ports.length > 0) {
      logs.push("❌ NGとなったポート一覧:");
      logs.push(...(data.failed_ports as string[]).map((p: string) => ` - ${p}`));
    }
  } catch (err) {
    logs.push(`ポート確認取得失敗: ${(err as Error).message}`);
    setStatus([...logs]);
    return;
  }

  setStatus([...logs]);
  setPhase(3);

  // フェーズ3：WebRTC診断
  logs.push("🔸 WebRTCログ");
  const webrtcLogs = await runWebRTCCheck();
  logs.push(...webrtcLogs);
  setStatus([...logs]);
  setDiagnosed(true);
};
