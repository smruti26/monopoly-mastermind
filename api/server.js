// api/server.js — must live at repo ROOT /api/server.js for Vercel to detect it.
// Bridges Vercel's Node.js req/res to TanStack Start's Web Fetch API handler.

let _handler;
async function getHandler() {
  if (!_handler) {
    // dist/server/server.js is one level up from api/
    const mod = await import("../dist/server/server.js");
    _handler = mod.default ?? mod;
  }
  return _handler;
}

async function toWebRequest(req) {
  const protocol = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "localhost";
  const url = new URL(req.url, `${protocol}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  let body = undefined;
  if (hasBody) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = Buffer.concat(chunks);
    if (body.length === 0) body = undefined;
  }

  return new Request(url.toString(), {
    method: req.method,
    headers,
    body,
    duplex: hasBody ? "half" : undefined,
  });
}

async function sendWebResponse(webRes, res) {
  res.statusCode = webRes.status;
  for (const [key, value] of webRes.headers.entries()) {
    res.setHeader(key, value);
  }
  if (webRes.body) {
    const reader = webRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
}

export default async function handler(req, res) {
  try {
    const fetchHandler = await getHandler();
    const webRequest = await toWebRequest(req);
    const webResponse = await fetchHandler.fetch(webRequest, {}, {});
    await sendWebResponse(webResponse, res);
  } catch (err) {
    console.error("[api/server.js] error:", err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}