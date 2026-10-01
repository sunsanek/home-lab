export async function onRequestGet({ request, env }) {
  if (!env.HOME_LAB_DB) {
    return Response.json({ ok: false, error: 'D1 binding HOME_LAB_DB is not configured' }, { status: 500 });
  }
  const url = new URL(request.url);
  const allowed = [1, 6, 24, 168];
  let hours = Number(url.searchParams.get('hours') || 24);
  if (!allowed.includes(hours)) hours = 24;
  const limit = hours <= 24 ? 1500 : 2500;

  const result = await env.HOME_LAB_DB.prepare(`
    SELECT recorded_at AS updated_at, cpu, ram, temperature, root_used, storage_used
    FROM metric_history
    WHERE recorded_at >= datetime('now', ?)
    ORDER BY recorded_at ASC
    LIMIT ?
  `).bind(`-${hours} hours`, limit).all();

  return Response.json({ ok: true, hours, points: result.results || [] },
    { headers: { 'Cache-Control': 'no-store' } });
}
