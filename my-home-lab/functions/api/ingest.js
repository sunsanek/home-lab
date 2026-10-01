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

  await env.HOME_LAB_DB.prepare(`
    CREATE TABLE IF NOT EXISTS metric_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recorded_at TEXT NOT NULL,
      cpu REAL,
      ram REAL,
      temperature REAL,
      root_used REAL,
      storage_used REAL
    )
  `).run();

  const rootUsed = Number(body?.storage?.['/']?.used_percent ?? null);
  const storageUsed = Number(body?.storage?.['/Storage']?.used_percent ?? null);

  await env.HOME_LAB_DB.prepare(`
    INSERT INTO metric_history
      (recorded_at, cpu, ram, temperature, root_used, storage_used)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    now,
    Number(body?.cpu ?? null),
    Number(body?.ram ?? null),
    Number(body?.temperature ?? null),
    Number.isFinite(rootUsed) ? rootUsed : null,
    Number.isFinite(storageUsed) ? storageUsed : null
  ).run();

  await env.HOME_LAB_DB.prepare(
    `DELETE FROM metric_history WHERE recorded_at < datetime('now', '-90 days')`
  ).run();

  return Response.json({ ok: true, updated_at: now });
}
