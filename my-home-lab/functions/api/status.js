export async function onRequestGet({ env }) {
  if (!env.HOME_LAB_DB) {
    return Response.json({ ok: true, mode: 'demo', live: false, reason: 'D1 binding HOME_LAB_DB is not configured' });
  }

  const row = await env.HOME_LAB_DB.prepare(
    'SELECT payload, updated_at FROM metrics WHERE id = 1'
  ).first();

  if (!row) {
    return Response.json({ ok: true, mode: 'waiting', live: false });
  }

  let payload;
  try { payload = JSON.parse(row.payload); } catch { payload = {}; }
  return Response.json({ ok: true, mode: 'live', live: true, updated_at: row.updated_at, ...payload });
}
