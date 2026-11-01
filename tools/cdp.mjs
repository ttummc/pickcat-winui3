// Minimal CDP client for driving Chrome. No deps; Node 22+ native WebSocket.
const HOST = process.env.CDP_HOST || "127.0.0.1";
const PORT = Number(process.env.CDP_PORT || 9333);

export async function http(path) {
  const r = await fetch(`http://${HOST}:${PORT}${path}`);
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}

export async function connectPage(urlMatch = "pickcat") {
  const list = await http("/json/list");
  const page = list.find((t) => t.type === "page" && t.url.includes(urlMatch)) || list.find((t) => t.type === "page");
  if (!page) throw new Error("no page target");
  return connectWs(page.webSocketDebuggerUrl);
}

export async function connectBrowser() {
  const v = await http("/json/version");
  return connectWs(v.webSocketDebuggerUrl);
}

export function connectWs(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const listeners = new Map();

    ws.addEventListener("open", () => {
      resolve({
        send(method, params = {}, sessionId) {
          const msgId = ++id;
          const payload = { id: msgId, method, params };
          if (sessionId) payload.sessionId = sessionId;
          ws.send(JSON.stringify(payload));
          return new Promise((res, rej) => {
            pending.set(msgId, { res, rej, method });
            setTimeout(() => {
              if (pending.has(msgId)) {
                pending.delete(msgId);
                rej(new Error(`timeout: ${method}`));
              }
            }, 60000);
          });
        },
        on(event, cb) {
          if (!listeners.has(event)) listeners.set(event, []);
          listeners.get(event).push(cb);
        },
        close() {
          ws.close();
        },
      });
    });

    ws.addEventListener("error", (e) => reject(new Error("ws error: " + e.message)));

    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej, method } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(`${method}: ${msg.error.message}`));
        else res(msg.result);
        return;
      }
      if (msg.method) {
        for (const cb of listeners.get(msg.method) || []) cb(msg.params, msg.sessionId);
      }
    });
  });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Evaluate an expression in the page, returning the value (awaits promises).
export async function evalIn(cdp, expression) {
  const r = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails));
  }
  return r.result.value;
}

export async function cookies(cdp) {
  const r = await cdp.send("Network.getAllCookies");
  return (r.cookies || []).filter((c) => c.domain.includes("pickcat"));
}

export async function screenshot(cdp, path, clip) {
  const fs = await import("node:fs");
  const params = { format: "png", captureBeyondViewport: false };
  if (clip) params.clip = { ...clip, scale: 1 };
  const r = await cdp.send("Page.captureScreenshot", params);
  fs.writeFileSync(path, Buffer.from(r.data, "base64"));
  return path;
}
