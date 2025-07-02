// runDiagnosis.ts（VPN判定強化に対応）
import runWebRTCCheck from "@/lib/runWebRTCCheck";

interface RunDiagnosisParams {
  setStatus: (logs: string[]) => void;
  setLoading: (val: boolean) => void;
  setDiagnosed: (val: boolean) => void;
  setPhase: (val: 1 | 2 | 3 | null) => void;
  timeoutMillisec?: number;
}

export const runDiagnosis = async ({ setStatus, setLoading, setDiagnosed, setPhase, timeoutMillisec = 3000 }: RunDiagnosisParams): Promise<void> => {
  setLoading(true);
  setDiagnosed(false);

  const phase1Logs: string[] = [];
  const phase2Logs: string[] = [];
  const phase3Logs: string[] = [];

  setPhase(1);
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
  phase3Logs.push("--- フェーズ3：映像通信（WebRTC）確認（relay限定） ---");
  const relayLogs = await runWebRTCCheck({ policy: 'relay', myGlobalIP: ip });
  phase3Logs.push(...relayLogs);

  phase3Logs.push("--- フェーズ3：映像通信（WebRTC）確認（P2P含む） ---");
  const allLogs = await runWebRTCCheck({ policy: 'all', myGlobalIP: ip });
  phase3Logs.push(...allLogs);

  setStatus([...phase1Logs, ...phase2Logs, ...phase3Logs]);
  setDiagnosed(true);
};
