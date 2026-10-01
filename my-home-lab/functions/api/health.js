export async function onRequestGet() {
  return Response.json({
    ok: true,
    mode: 'demo',
    timestamp: new Date().toISOString(),
    services: {
      proxmox: 'online',
      homeAssistant: 'online',
      vpn: 'online',
      immich: 'online'
    }
  });
}
