// src\app\api\fqdncheck\route.ts

export async function GET() {
  const targets = [
    {
      name: "www.alarm.com",
      url: "https://www.alarm.com/web/system/home"
    },
    {
      name: "international.alarm.com",
      url: "https://international.alarm.com/landing/wp-content/uploads/sites/12/2024/03/ADC_Favicon_16x16.png"
    }
  ];

  const results: string[] = [];

  for (const target of targets) {
    try {
      const res = await fetch(target.url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
        }
      });

      results.push(`${target.name}: ${res.status === 200 ? "OK" : `NG (status: ${res.status})`}`);
    } catch (err) {
      results.push(`${target.name}: NG (エラー: ${(err as Error).message})`);
    }
  }

  return new Response(results.join("\\n"), { status: 200 });
}
