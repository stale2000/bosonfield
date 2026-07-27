/** Validate a catalog handoff without accepting executable or credential-bearing URLs. */
export function isExternalComfyUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    const credentialParam = /^(?:api[_-]?key|access[_-]?token|token|secret|password|authorization)$/i;
    const hasCredentialParam = [...url.searchParams.keys()].some((key) => credentialParam.test(key)) || credentialParam.test(url.hash.replace(/^#/, "").split("=")[0]);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname) && !url.username && !url.password && !hasCredentialParam;
  } catch {
    return false;
  }
}
