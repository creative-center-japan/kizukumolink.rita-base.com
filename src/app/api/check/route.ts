export async function GET() {
  try {
    const [checkRes, ipRes] = await Promise.all([
      fetch("http://50.16.103.67:5050/check"),
      fetch("http://50.16.103.67:5050/external-ip")
    ]);

    const checkText = await checkRes.text();
    const ipText = await ipRes.text();

    const checkLines = checkText.split('\n').filter(line => line.trim() !== "");
    const ipLine = `🔸外部IP: ${ipText.trim()}`;

    // 外部IPをログの先頭に追加
    const mergedLines = [ipLine, ...checkLines];

    return Response.json(mergedLines);
  } catch (error: unknown) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
