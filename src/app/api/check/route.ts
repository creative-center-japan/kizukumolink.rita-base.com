// src/app/api/check/route.ts

export async function GET() {
  try {
    const [checkRes, ipRes] = await Promise.all([
      fetch("http://3.80.218.25:5050/check"),
      fetch("http://3.80.218.25:5050/external-ip")
    ]);

    const checkText = await checkRes.text(); // /check は text/plain
    const ipText = await ipRes.text();       // /external-ip は plain text

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
