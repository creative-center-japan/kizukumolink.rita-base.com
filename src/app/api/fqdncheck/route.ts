// src\app\api\fqdncheck\route.ts

export async function GET() {
  try {
    const res = await fetch("https://international.alarm.com/landing/jp/", {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (res.ok) {
      return new Response("OK", { status: 200 });
    } else {
      return new Response("NG", { status: res.status });
    }
  } catch (err) {
    return new Response(`NG (エラー: ${(err as Error).message})`, { status: 500 });
  }
}
