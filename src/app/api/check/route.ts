// src/app/api/check/route.ts
export async function GET() {
  try {
    const [checkRes, ipRes] = await Promise.all([
      fetch("http://50.16.103.67:5050/check"),
      fetch("http://50.16.103.67:5050/external-ip")
    ]);

    const checkText = await checkRes.text();
    const ipText = await ipRes.text();

    const checkLines = checkText.split('\n');
    checkLines.push(`🌐 外部IP（補完）: ${ipText}`);

    return Response.json(checkLines);
  } catch (error: unknown) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
