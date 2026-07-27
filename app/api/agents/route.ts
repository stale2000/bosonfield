import { invalid, stableDryId } from "../_dry-data";

export type DryAgentMessage = { id: string; role: "user" | "agent"; text: string; createdAt: string };
export type DryAgentRun = { id: string; state: "pending_approval" | "queued" | "complete"; prompt: string; createdAt: string };
export type DryAgent = {
  id: string;
  name: string;
  template: string;
  instructions: string;
  capabilities: string[];
  approvalRequired: true;
  messages: DryAgentMessage[];
  runs: DryAgentRun[];
  createdAt: string;
  updatedAt: string;
};

type AgentRuntime = typeof globalThis & { __bosonfieldAgents?: DryAgent[] };
const runtime = globalThis as AgentRuntime;
const agents = runtime.__bosonfieldAgents ?? (runtime.__bosonfieldAgents = [{
  id: "agent_dry_field",
  name: "Field assistant",
  template: "Creative director",
  instructions: "Turn a brief into bounded, reviewable ComfyUI steps.",
  capabilities: ["Plan", "Read library", "Draft workflow", "Queue with approval"],
  approvalRequired: true,
  messages: [],
  runs: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}]);

const text = (value: unknown, field: string, max = 4000) => {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(`${field} must be a non-empty string of at most ${max} characters`);
  return value.trim();
};
const optionalText = (value: unknown, field: string, max = 4000) => {
  if (value === undefined) return undefined;
  return text(value, field, max);
};
const capabilities = (value: unknown) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim()) || value.length > 12) throw new Error("capabilities must be an array of at most 12 strings");
  return value.map((item) => item.trim());
};

export function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ mode: "dry-run", agents });
  const agent = agents.find((item) => item.id === id);
  if (!agent) return Response.json({ error: { code: "AGENT_NOT_FOUND", message: "Agent not found" } }, { status: 404 });
  return Response.json({ mode: "dry-run", agent });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (typeof body.id === "string" && body.id.trim() && typeof body.action === "string") {
    const agent = agents.find((item) => item.id === body.id);
    if (!agent) return Response.json({ error: { code: "AGENT_NOT_FOUND", message: "Agent not found" } }, { status: 404 });
    try {
      if (body.action === "message") {
        const prompt = text(body.text, "text", 4000);
        const now = new Date().toISOString();
        const reply = `Plan ready: I’ll break “${prompt}” into a bounded brief, references, and ComfyUI-ready steps.`;
        agent.messages.push({ id: `agent_msg_${crypto.randomUUID()}`, role: "user", text: prompt, createdAt: now });
        agent.messages.push({ id: `agent_msg_${crypto.randomUUID()}`, role: "agent", text: reply, createdAt: new Date().toISOString() });
        agent.updatedAt = new Date().toISOString();
        return Response.json({ mode: "dry-run", agent, message: reply }, { status: 201 });
      }
      if (body.action === "run") {
        const prompt = text(body.prompt ?? "Agent plan", "prompt", 4000);
        const run: DryAgentRun = { id: `agent_run_${crypto.randomUUID()}`, state: "pending_approval", prompt, createdAt: new Date().toISOString() };
        agent.runs.push(run);
        agent.updatedAt = new Date().toISOString();
        return Response.json({ mode: "dry-run", agent, run }, { status: 202 });
      }
      if (body.action === "approve") {
        const runId = text(body.runId, "runId", 120);
        const run = agent.runs.find((item) => item.id === runId);
        if (!run) return Response.json({ error: { code: "AGENT_RUN_NOT_FOUND", message: "Agent run not found" } }, { status: 404 });
        if (run.state !== "pending_approval") return Response.json({ mode: "dry-run", agent, run });
        run.state = "queued";
        agent.updatedAt = new Date().toISOString();
        return Response.json({ mode: "dry-run", agent, run });
      }
      throw new Error("action must be message, run, or approve");
    } catch (error) { return invalid(error instanceof Error ? error.message : "invalid agent action"); }
  }
  try {
    const name = text(body.name, "name", 120);
    const template = text(body.template ?? "Custom agent", "template", 120);
    const instructions = text(body.instructions ?? "Turn a brief into bounded, reviewable ComfyUI steps.", "instructions");
    const caps = capabilities(body.capabilities) ?? ["Plan", "Read library", "Draft workflow", "Queue with approval"];
    const key = typeof body.idempotencyKey === "string" && body.idempotencyKey.trim() ? body.idempotencyKey.trim().slice(0, 128) : undefined;
    const id = stableDryId("agent", key ?? `${name}:${template}`);
    const existing = agents.find((item) => item.id === id);
    if (existing) return Response.json({ mode: "dry-run", agent: existing });
    const now = new Date().toISOString();
    const agent: DryAgent = { id, name, template, instructions, capabilities: caps, approvalRequired: true, messages: [], runs: [], createdAt: now, updatedAt: now };
    agents.push(agent);
    return Response.json({ mode: "dry-run", agent }, { status: 201 });
  } catch (error) { return invalid(error instanceof Error ? error.message : "invalid agent"); }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (typeof body.id !== "string" || !body.id.trim()) return invalid("id is required");
  const agent = agents.find((item) => item.id === body.id);
  if (!agent) return Response.json({ error: { code: "AGENT_NOT_FOUND", message: "Agent not found" } }, { status: 404 });
  try {
    const name = optionalText(body.name, "name", 120);
    const template = optionalText(body.template, "template", 120);
    const instructions = optionalText(body.instructions, "instructions");
    const caps = capabilities(body.capabilities);
    if (name !== undefined) agent.name = name;
    if (template !== undefined) agent.template = template;
    if (instructions !== undefined) agent.instructions = instructions;
    if (caps !== undefined) agent.capabilities = caps;
    agent.updatedAt = new Date().toISOString();
    return Response.json({ mode: "dry-run", agent });
  } catch (error) { return invalid(error instanceof Error ? error.message : "invalid agent"); }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const index = id ? agents.findIndex((item) => item.id === id) : -1;
  if (index < 0) return Response.json({ error: { code: "AGENT_NOT_FOUND", message: "Agent not found" } }, { status: 404 });
  const [agent] = agents.splice(index, 1);
  return Response.json({ deleted: agent.id, mode: "dry-run" });
}
