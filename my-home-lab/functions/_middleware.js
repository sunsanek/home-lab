export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // The Proxmox agent has its own authentication on /api/ingest.
  if (url.pathname === "/api/ingest") {
    return next();
  }

  // Allow an already authenticated browser session.
  const cookies = request.headers.get("Cookie") || "";
  const hasAuthCookie = cookies.split(";").some(
    cookie => cookie.trim() === "home_lab_auth=1"
  );

  if (hasAuthCookie) {
    return next();
  }

  // First access: /?key=YOUR_SECRET
  const key = url.searchParams.get("key");

  if (key && env.key && key === env.key) {
    const cleanUrl = new URL(request.url);
    cleanUrl.searchParams.delete("key");

    return new Response(null, {
      status: 302,
      headers: {
        "Location": cleanUrl.toString(),
        "Set-Cookie":
          "home_lab_auth=1; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000"
      }
    });
  }

  return new Response("Access denied", {
    status: 403,
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
