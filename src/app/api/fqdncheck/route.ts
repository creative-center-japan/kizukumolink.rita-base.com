// src\app\api\fqdncheck\route.ts

export async function GET() {
  try {
    const res = await fetch("https://www.alarm.com/web/system/home", {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    if (res.status === 200) {
      return new Response("OK", { status: 200 });
    } else {
      return new Response(`NG (HTTP ${res.status})`, { status: res.status });
    }
  } catch (err) {
    return new Response(`NG (エラー: ${(err as Error).message})`, { status: 500 });
  }
}
