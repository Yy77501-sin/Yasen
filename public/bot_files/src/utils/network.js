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
  if (!proxy) return {};
  return {
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
  parseProxyUrl,
  getAxiosNetworkOptions,
  isNetworkPermissionError,
};

