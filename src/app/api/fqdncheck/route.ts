// src/app/api/fqdncheck/route.ts

export async function GET() {
  const targets = [
    "https://www.alarm.com/favicon.ico"
  ];

  const results: string[] = [];

  for (const url of targets) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });

      if (res.status === 200) {
        results.push(`✅ ${url} → OK (200)`);
      } else {
        results.push(`⚠️ ${url} → NG (${res.status})`);
      }

    } catch (err) {
      results.push(`❌ ${url} → エラー: ${(err as Error).message}`);
    }
  }

  return new Response(results.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain"
    }
  });
}
