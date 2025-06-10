// rita-base\lib\runDiagnosis.ts

// -------------------------
// runDiagnosis.ts
// - フェーズ1〜3の診断ロジックを統括
// - 各状態変更(setter)を外部から受け取り実行
// - runWebRTCCheckを内包して総合診断を完成
// -------------------------
// rita-base\lib\runDiagnosis.ts

import runWebRTCCheck from "@/lib/runWebRTCCheck";

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

  // --- Phase 1 ---
  let ip = "取得失敗";
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    ip = data.ip;
  } catch { }

  let fqdnStatus = "NG";
  let fqdnLogs: string[] = [];

  try {
    const res = await fetch("/api/fqdncheck");
    const result = await res.json();
    fqdnStatus = result.status;
    fqdnLogs = result.details ?? [];
  } catch (err) {
    fqdnLogs.push(`❌ FQDNチェック失敗: ${(err as Error).message}`);
  }

  logs.push(`📅 実行日時: ${new Date().toLocaleString("ja-JP", { hour12: false })}`);
  logs.push(`🔸外部IP: ${ip}`);
  logs.push(`🔸サービスへの通信確認: ${fqdnStatus}`);
  logs.push(...fqdnLogs);

  setPhase(2);

  // --- Phase 2 ---
  try {
    const res = await fetch("https://check-api.rita-base.com/check-json");
    const data = await res.json();

    logs.push("🔸 TCPポート確認:");
    for (const [port, result] of Object.entries(data.tcp)) {
      logs.push(`ポート確認: TCP ${port} → ${result === "success" ? "OK" : "NG"}`);
    }

    logs.push("🔸 UDPポート確認:");
    for (const [port, result] of Object.entries(data.udp)) {
      logs.push(`ポート確認: UDP ${port} → ${result === "success" ? "OK" : "NG"}`);
    }

    if (data.failed_ports.length > 0) {
      logs.push("❌ NGとなったポート一覧:");
      logs.push(...(data.failed_ports as string[]).map((p: string) => ` - ${p}`));
    }
  } catch (err) {
    logs.push(`ポート確認取得失敗: ${(err as Error).message}`);
    setStatus(logs); // ← エラーパスのときだけ早期 return
    return;
  }

  setPhase(3);

  // --- Phase 3 ---
  logs.push("🔸 WebRTCログ");
  const webrtcLogs = await runWebRTCCheck();
  logs.push(...webrtcLogs);

  // ✅ 最後に1回だけ setStatus（←順番崩れない！）
  setStatus([...logs]);
  setDiagnosed(true);
};
