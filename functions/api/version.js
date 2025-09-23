// functions/api/version.js
export async function onRequest(context) {
  const env = context.env || {};
  const info = {
    commit: env.CF_PAGES_COMMIT_SHA || null,
    branch: env.CF_PAGES_BRANCH || null,
    build_id: env.CF_PAGES_BUILD_ID || null,
    url: env.CF_PAGES_URL || null,
    time: new Date().toISOString(),
  };
  return new Response(JSON.stringify(info, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
