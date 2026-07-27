import assert from "node:assert/strict";
import test from "node:test";

async function request(path, init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, init), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}
const json = (value) => ({ headers: { "content-type": "application/json" }, body: JSON.stringify(value) });

test("agent and design records persist across CRUD requests", async () => {
  const createdAgentResponse = await request("/api/agents", { method: "POST", ...json({ name: "Test planner", template: "Creative director", instructions: "Plan a short", idempotencyKey: "agent-api-test" }) });
  assert.equal(createdAgentResponse.status, 201);
  const createdAgent = (await createdAgentResponse.json()).agent;
  const updatedAgentResponse = await request("/api/agents", { method: "PATCH", ...json({ id: createdAgent.id, instructions: "Plan and review a short" }) });
  assert.equal(updatedAgentResponse.status, 200);
  assert.equal((await updatedAgentResponse.json()).agent.instructions, "Plan and review a short");
  const listedAgents = await request("/api/agents");
  assert.ok((await listedAgents.json()).agents.some((agent) => agent.id === createdAgent.id));

  const messageResponse = await request("/api/agents", { method: "POST", ...json({ id: createdAgent.id, action: "message", text: "Create a three-shot plan" }) });
  assert.equal(messageResponse.status, 201);
  const messageBody = await messageResponse.json();
  assert.equal(messageBody.agent.messages.at(-1).role, "agent");
  assert.match(messageBody.message, /three-shot plan/);
  const runResponse = await request("/api/agents", { method: "POST", ...json({ id: createdAgent.id, action: "run", prompt: "Create a three-shot plan" }) });
  assert.equal(runResponse.status, 202);
  const pendingRun = (await runResponse.json()).run;
  assert.equal(pendingRun.state, "pending_approval");
  const approvedRunResponse = await request("/api/agents", { method: "POST", ...json({ id: createdAgent.id, action: "approve", runId: pendingRun.id }) });
  assert.equal((await approvedRunResponse.json()).run.state, "queued");

  const badDesign = await request("/api/designs", { method: "POST", ...json({ name: "No brief" }) });
  assert.equal(badDesign.status, 400);
  const createdDesignResponse = await request("/api/designs", { method: "POST", ...json({ name: "Test board", brief: "A quiet reveal", beats: ["Open", "Reveal"], idempotencyKey: "design-api-test" }) });
  assert.equal(createdDesignResponse.status, 201);
  const createdDesign = (await createdDesignResponse.json()).design;
  const updatedDesignResponse = await request("/api/designs", { method: "PATCH", ...json({ id: createdDesign.id, status: "review", beats: ["Open", "Reveal", "Close"] }) });
  assert.equal(updatedDesignResponse.status, 200);
  assert.equal((await updatedDesignResponse.json()).design.status, "review");
  const listedDesigns = await request("/api/designs");
  assert.ok((await listedDesigns.json()).designs.some((design) => design.id === createdDesign.id));
});

test("agent and design boundaries reject unknown records", async () => {
  const agent = await request("/api/agents?id=missing-agent");
  assert.equal(agent.status, 404);
  const design = await request("/api/designs", { method: "PATCH", ...json({ id: "missing-design", status: "review" }) });
  assert.equal(design.status, 404);
});
