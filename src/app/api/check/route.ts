// src/app/api/check/route.ts

export async function GET() {
  try {
    const response = await fetch("http://3.80.218.25:5050/check");
    const data = await response.json();
    return Response.json(data);
  } catch (error: unknown) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}