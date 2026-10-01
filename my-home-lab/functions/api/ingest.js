export async function onRequestPost({ request, env }) {
  const auth = request.headers.get('Authorization') || '';
  const expected = env.INGEST_TOKEN || '';
  if (!expected || auth !== `Bearer ${expected}`) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!env.HOME_LAB_DB) {
    return Response.json({ ok: false, error: 'D1 binding HOME_LAB_DB is not configured' }, { status: 500 });
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return Response.json({ ok: false, error: 'application/json required' }, { status: 415 });
  }

  const body = await request.json();
  const payload = JSON.stringify(body);
  const now = new Date().toISOString();
  await env.HOME_LAB_DB.prepare(
    'INSERT INTO metrics (id, payload, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at'
  ).bind(payload, now).run();

  return Response.json({ ok: true, updated_at: now });
}
