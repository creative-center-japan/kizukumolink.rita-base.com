// src/app/api/fqdncheck/route.ts

export async function GET() {
  const targets = [
    "https://www.alarm.com/favicon.ico"
  ];

  const results: string[] = [];
  let isAny200 = false;

  for (const url of targets) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      if (res.status === 200) {
        const msg = `✅ ${url} → OK (${res.status})`;
        console.log("[LOG]", msg);  // ← デバッグ用にログ出力しよう！
        results.push(msg);
        isAny200 = true;
      } else {
        results.push(`⚠️ ${url} → NG (${res.status})`);
      }

    } catch (err) {
      results.push(`❌ ${url} → エラー: ${(err as Error).message}`);
    }
  }

  return new Response(JSON.stringify({
    status: isAny200 ? "OK" : "NG",
    details: results
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
