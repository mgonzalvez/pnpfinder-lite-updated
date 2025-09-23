// functions/api/games.js
// Cloudflare Pages Function: Proxies your published Google Sheet CSV to the client.
// This keeps your Sheet URL secret and avoids CORS issues.
export async function onRequest(context) {
  const { SHEET_CSV_URL } = context.env;
  if (!SHEET_CSV_URL) {
    return new Response("Missing SHEET_CSV_URL", { status: 500 });
  }
  try {
    const upstream = await fetch(SHEET_CSV_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (!upstream.ok) {
      return new Response(`Upstream error ${upstream.status}`, { status: upstream.status });
    }
    const csv = await upstream.text();
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "cache-control": "public, max-age=300"
      }
    });
  } catch (err) {
    return new Response("Fetch error", { status: 502 });
  }
}
