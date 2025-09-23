// functions/api/games.js
export async function onRequest(context) {
  const { SHEET_CSV_URL } = context.env;
  if (!SHEET_CSV_URL) {
    return new Response("Missing SHEET_CSV_URL (Pages → Settings → Environment variables → Production)", { status: 500 });
  }
  try {
    const upstream = await fetch(SHEET_CSV_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return new Response(`Upstream error ${upstream.status}: ${text.slice(0,200)}`, { status: upstream.status });
    }
    const csv = await upstream.text();
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "cache-control": "public, max-age=300"
      }
    });
  } catch (err) {
    return new Response("Fetch error: " + (err && err.message || ""), { status: 502 });
  }
}
