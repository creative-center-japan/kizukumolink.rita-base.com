// src\app\api\fqdncheck\route.ts

// src\app\api\fqdncheck\route.ts

export async function GET() {
  const targets = [
    "https://www.alarm.com/favicon.ico",
    "https://www.devicetask.com/favicon.ico",
    "https://api.devicetask.com/",
  ];

  const results: string[] = [];

  for (const url of targets) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
      });

      const resultText = `${url} → ${res.status}`;
      console.log(resultText);

      if (res.status >= 200 && res.status < 500) {
        results.push(`✅ ${url} → OK (${res.status})`);
      } else {
        results.push(`⚠️ ${url} → NG (${res.status})`);
      }

    } catch (err) {
      const errMsg = `❌ ${url} → エラー: ${(err as Error).message}`;
      console.error(errMsg);
      results.push(errMsg);
    }
  }

  return new Response(results.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain"
    }
  });
}
