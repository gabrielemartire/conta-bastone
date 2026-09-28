const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

async function authorized(request, env) {
  const got = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!env.TOKEN || !got) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(got)),
    crypto.subtle.digest("SHA-256", enc.encode(env.TOKEN)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}

const list = async (env) => {
  const { results } = await env.DB.prepare(
    "SELECT id, name, hits, coats FROM players ORDER BY created_at, id"
  ).all();
  return json(results);
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (pathname === "/cappotti" || pathname === "/cappotti/")
      return env.ASSETS.fetch(new Request(new URL("/", url), request));
    if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    if (pathname === "/api/players" && method === "GET") return list(env);

    if (!(await authorized(request, env))) return json({ error: "nope" }, 401);

    if (pathname === "/api/auth") return json({ ok: true });

    if (pathname === "/api/players" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      const name = String(body.name ?? "").trim().slice(0, 24);
      if (!name) return json({ error: "name" }, 400);
      await env.DB.prepare("INSERT INTO players (name) VALUES (?)").bind(name).run();
      return list(env);
    }

    const m = pathname.match(/^\/api\/players\/(\d+)(?:\/(un)?(hit|coat))?$/);
    if (m) {
      const id = Number(m[1]);
      if (method === "DELETE" && !m[3]) {
        await env.DB.prepare("DELETE FROM players WHERE id = ?").bind(id).run();
        return list(env);
      }
      if (method === "POST" && m[3]) {
        const col = m[3] === "hit" ? "hits" : "coats"; // whitelisted by the regex
        const expr = m[2] ? `MAX(${col} - 1, 0)` : `${col} + 1`;
        await env.DB.prepare(`UPDATE players SET ${col} = ${expr} WHERE id = ?`).bind(id).run();
        return list(env);
      }
    }

    return json({ error: "not found" }, 404);
  },
};
