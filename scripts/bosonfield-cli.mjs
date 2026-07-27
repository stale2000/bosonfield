#!/usr/bin/env node

const baseUrl = (process.env.BOSONFIELD_URL || `http://localhost:${process.env.PORT || "5173"}`).replace(/\/$/, "");
const [command, ...args] = process.argv.slice(2);

async function call(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || `Request failed (${response.status})`);
  return body;
}

try {
  let result;
  if (command === "capabilities") result = await call("/api/mcp");
  else if (command === "plan" || command === "approve") {
    const [workflowId, ...promptParts] = args;
    if (!workflowId || !promptParts.length) throw new Error(`Usage: bosonfield ${command} <workflowId> <prompt>`);
    result = await call("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: command, workflowId, prompt: promptParts.join(" ") }) });
  } else if (command === "job") {
    if (!args[0]) throw new Error("Usage: bosonfield job <jobId>");
    result = await call("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "get_job", jobId: args[0] }) });
  } else throw new Error("Usage: bosonfield capabilities | plan <workflowId> <prompt> | approve <workflowId> <prompt> | job <jobId>");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
