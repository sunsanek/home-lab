export async function onRequestGet({ env }) {
  return Response.json({
    ok: true,
    mode: env.HOME_LAB_DB ? 'configured' : 'demo',
    timestamp: new Date().toISOString()
  });
}
