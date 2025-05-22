// src\app\api\fqdncheck\route.ts

export async function GET() {
  try {
    const res = await fetch("https://international.alarm.com/landing/jp/", { method: "GET" });
    if (res.ok) {
      return new Response("OK", { status: 200 });
    } else {
      return new Response(`NG (status: ${res.status})`, { status: res.status });
    }
  } catch (err) {
    return new Response(`NG (エラー: ${(err as Error).message})`, { status: 500 });
  }
}
