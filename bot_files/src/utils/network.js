const http = require("http");
const https = require("https");

// Global keep-alive agents to reuse TCP/TLS connections and drastically reduce latency
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 20,
  timeout: 60000,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 20,
  timeout: 60000,
});

function parseProxyUrl(proxyUrl) {
  const raw = String(proxyUrl || "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    const port = Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80));
    if (!parsed.hostname || !Number.isFinite(port)) return null;
    const auth = parsed.username
      ? {
          username: decodeURIComponent(parsed.username),
          password: decodeURIComponent(parsed.password || ""),
        }
      : null;
    return {
      protocol: parsed.protocol.replace(":", ""),
      host: parsed.hostname,
      port,
      auth,
    };
  } catch (_) {
    return null;
  }
}

function getAxiosNetworkOptions(proxyEnvValue) {
  const proxy = parseProxyUrl(proxyEnvValue);
  const baseOptions = {
    httpAgent,
    httpsAgent,
    timeout: 15000, // 15s timeout to prevent hanging connections
  };

  if (!proxy) return baseOptions;

  return {
    ...baseOptions,
    proxy: {
      protocol: proxy.protocol,
      host: proxy.host,
      port: proxy.port,
      ...(proxy.auth ? { auth: proxy.auth } : {}),
    },
  };
}

function isNetworkPermissionError(error) {
  const code = String(error?.code || error?.cause?.code || "").toUpperCase();
  const message = String(error?.message || "").toUpperCase();
  return (
    code === "EACCES"
    || code === "ENETUNREACH"
    || code === "EHOSTUNREACH"
    || code === "ETIMEDOUT"
    || code === "ECONNREFUSED"
    || code === "ECONNRESET"
    || message.includes("EACCES")
    || message.includes("ENETUNREACH")
    || message.includes("EHOSTUNREACH")
    || message.includes("ETIMEDOUT")
  );
}

module.exports = {
  httpAgent,
  httpsAgent,
  parseProxyUrl,
  getAxiosNetworkOptions,
  isNetworkPermissionError,
};

