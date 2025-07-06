// src/app/api/check-turn/route.ts

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch("https://50.16.103.67:3478", {
      method: "OPTIONS",
      mode: "no-cors"
    });

    return NextResponse.json({
      ok: true,
      status: res.status
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: (err as Error).message
    }, { status: 500 });
  }
}
