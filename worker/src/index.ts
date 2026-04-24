interface Env {
  ALLOWED_ORIGINS: string;
  TARGET_HOSTS: string;
}

const LOCALHOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function isOriginAllowed(origin: string | null, env: Env): boolean {
  if (!origin) return false;
  if (LOCALHOST_PATTERN.test(origin)) return true;
  const allowed = env.ALLOWED_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.includes(origin);
}

function isTargetAllowed(target: URL, env: Env): boolean {
  const hosts = env.TARGET_HOSTS.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return hosts.includes(target.hostname.toLowerCase());
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      if (!isOriginAllowed(origin, env)) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin!) });
    }

    if (request.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (!isOriginAllowed(origin, env)) {
      return new Response("Forbidden: origin not allowed", { status: 403 });
    }

    const reqUrl = new URL(request.url);
    const target = reqUrl.searchParams.get("url");
    if (!target) {
      return new Response("Missing ?url= parameter", {
        status: 400,
        headers: corsHeaders(origin!),
      });
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response("Invalid ?url= parameter", {
        status: 400,
        headers: corsHeaders(origin!),
      });
    }

    if (targetUrl.protocol !== "https:") {
      return new Response("Only https targets are allowed", {
        status: 400,
        headers: corsHeaders(origin!),
      });
    }

    if (!isTargetAllowed(targetUrl, env)) {
      return new Response(`Target host not allowed: ${targetUrl.hostname}`, {
        status: 400,
        headers: corsHeaders(origin!),
      });
    }

    const upstream = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: {
        // Otomoto blocks requests without a browser-like UA.
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "pl,en-US;q=0.9,en;q=0.8",
      },
      // Let Cloudflare cache upstream responses for a short while.
      cf: { cacheTtl: 60, cacheEverything: true } as RequestInitCfProperties,
    });

    const headers = new Headers(corsHeaders(origin!));
    const ct = upstream.headers.get("content-type");
    if (ct) headers.set("Content-Type", ct);
    headers.set("X-Upstream-Status", String(upstream.status));

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  },
} satisfies ExportedHandler<Env>;
