// Tiny stand-in for Supabase's Kong gateway: routes /auth/v1 → GoTrue, /rest/v1 → PostgREST.
// Local development only. Storage and Realtime are not proxied.
import http from "node:http";

const routes = { "/auth/v1": 9999, "/rest/v1": 54330 };

http
  .createServer((req, res) => {
    const prefix = Object.keys(routes).find((p) => req.url.startsWith(p));
    if (!prefix) {
      res.writeHead(501, { "content-type": "application/json" });
      return res.end(JSON.stringify({ message: "not available in local gateway" }));
    }
    const upstream = http.request(
      { host: "127.0.0.1", port: routes[prefix], path: req.url.slice(prefix.length) || "/", method: req.method, headers: req.headers },
      (up) => {
        res.writeHead(up.statusCode, up.headers);
        up.pipe(res);
      },
    );
    upstream.on("error", (e) => {
      res.writeHead(502);
      res.end(String(e));
    });
    req.pipe(upstream);
  })
  .listen(54321, "127.0.0.1", () => console.log("local supabase gateway on http://127.0.0.1:54321"));
