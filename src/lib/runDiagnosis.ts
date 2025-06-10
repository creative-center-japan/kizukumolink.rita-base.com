// rita-base\lib\runDiagnosis.ts

// -------------------------
// runDiagnosis.ts
// - フェーズ1〜3の診断ロジックを統括
// - 各状態変更(setter)を外部から受け取り実行
// - runWebRTCCheckを内包して総合診断を完成
// -------------------------

import runWebRTCCheck from "@/lib/runWebRTCCheck";

export const runDiagnosis = async (
  setStatus: (logs: string[]) => void,
  setLoading: (val: boolean) => void,
  setDiagnosed: (val: boolean) => void,
  setPhase: (val: 1 | 2 | 3 | null) => void
): Promise<void> => {
  setLoading(true);
  setDiagnosed(false);

  const phase1Logs: string[] = [];
  const phase2Logs: string[] = [];
  const phase3Logs: string[] = [];

  setPhase(1);

  // --- Phase 1：IP + FQDN ---
  phase1Logs.push("--- フェーズ1：サービス接続確認 ---");

  let ip = "取得失敗";
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    ip = data.ip;
  } catch {}

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

  phase1Logs.push(`🔸実行日時: ${new Date().toLocaleString("ja-JP", { hour12: false })}`);
  phase1Logs.push(`🔸外部IP: ${ip}`);
  phase1Logs.push(`🔸サービスへの通信確認: ${fqdnStatus}`);
  phase1Logs.push(...fqdnLogs);

  setPhase(2);

  // --- Phase 2：ポート確認 ---
  phase2Logs.push("--- フェーズ2：ポート通信確認 ---");

  try {
    const res = await fetch("https://check-api.rita-base.com/check-json");
    const data = await res.json();

    phase2Logs.push("🔸 TCPポート確認:");
    for (const [port, result] of Object.entries(data.tcp)) {
      phase2Logs.push(`ポート確認: TCP ${port} → ${result === "success" ? "OK" : "NG"}`);
    }

    phase2Logs.push("🔸 UDPポート確認:");
    for (const [port, result] of Object.entries(data.udp)) {
      phase2Logs.push(`ポート確認: UDP ${port} → ${result === "success" ? "OK" : "NG"}`);
    }

    if (data.failed_ports.length > 0) {
      phase2Logs.push("❌ NGとなったポート一覧:");
      phase2Logs.push(...(data.failed_ports as string[]).map((p: string) => ` - ${p}`));
    }
  } catch (err) {
    phase2Logs.push(`ポート確認取得失敗: ${(err as Error).message}`);
    setStatus([...phase1Logs, ...phase2Logs]);
    return;
  }

  setPhase(3);

  // --- Phase 3：WebRTC診断 ---
  phase3Logs.push("--- 【診断ツール停止中】フェーズ3：映像通信（WebRTC）確認 ---");

  const webrtcLogs = await runWebRTCCheck();
  phase3Logs.push(...webrtcLogs);

  // ✅ 最終ログ表示（順序整ってキレイ）
  setStatus([...phase1Logs, ...phase2Logs, ...phase3Logs]);
  setDiagnosed(true);
};
