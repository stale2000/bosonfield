import catalog from "../../../workflows/manifests/catalog.json";
import { adapterMode } from "../../../lib/comfy-adapter";
import { savedWorkflows, workflowRecord } from "../../../lib/workflow-store";
import { dryAssets, dryJobs, dryProjects, materializeDryJob, stableDryId } from "../_dry-data";

const tools = ["bosonfield.list_capabilities", "bosonfield.get_preset", "bosonfield.plan_generation", "bosonfield.approve_and_enqueue", "bosonfield.get_job", "bosonfield.get_asset", "bosonfield.list_project_assets"];

function listCapabilities() {
  return [...catalog.map((item) => ({ id: item.id, capability: item.capability, label: item.label, inputs: item.inputs })), ...[...savedWorkflows.values()].map((item) => { const record = workflowRecord(item.id); return { id: item.id, capability: "custom.graph", label: item.label, inputs: record?.inputs ?? [] }; })];
}

export async function GET() {
  return Response.json({ mode: adapterMode(), tools, capabilities: listCapabilities(), policy: { rawGraphExecution: false, approvalRequired: true } });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { action?: "list_capabilities" | "get_preset" | "plan" | "approve" | "get_job" | "get_asset" | "list_project_assets"; workflowId?: string; prompt?: string; jobId?: string; assetId?: string; projectId?: string };
  if (body.action === "list_capabilities") return Response.json({ mode: adapterMode(), capabilities: listCapabilities() });
  if (body.action === "get_preset") {
    const preset = body.workflowId ? workflowRecord(body.workflowId) : undefined;
    return preset ? Response.json({ mode: adapterMode(), preset }) : Response.json({ error: { code: "WORKFLOW_NOT_FOUND", message: "Unknown preset" } }, { status: 404 });
  }
  if (body.action === "get_job") { const job = body.jobId ? dryJobs.get(body.jobId) : undefined; if (!job) return Response.json({ error: { code: "JOB_NOT_FOUND", message: "Unknown job" } }, { status: 404 }); materializeDryJob(job); return Response.json({ mode: adapterMode(), job }); }
  if (body.action === "get_asset") { const asset = body.assetId ? dryAssets.find((entry) => entry.id === body.assetId) : undefined; return asset ? Response.json({ mode: adapterMode(), asset, provenance: { mode: adapterMode(), visibility: asset.visibility } }) : Response.json({ error: { code: "ASSET_NOT_FOUND", message: "Unknown asset" } }, { status: 404 }); }
  if (body.action === "list_project_assets") { const projectId = body.projectId ?? "project_dry_01"; const project = dryProjects.find((entry) => entry.id === projectId); if (!project) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: "Unknown project" } }, { status: 404 }); return Response.json({ mode: adapterMode(), projectId, assets: project.assetIds.map((assetId) => dryAssets.find((asset) => asset.id === assetId)).filter(Boolean) }); }
  const workflow = body.workflowId ? workflowRecord(body.workflowId) : undefined;
  if (!workflow || !body.prompt?.trim() || !["plan", "approve"].includes(body.action ?? "")) return Response.json({ error: { code: "INPUT_INVALID", message: "action, workflowId, and prompt are required" } }, { status: 400 });
  if (body.action === "plan") return Response.json({ mode: adapterMode(), planId: `plan_${workflow.id}`, workflowId: workflow.id, estimatedCredits: 1, approvalRequired: true, status: "awaiting-approval" });
  const id = stableDryId("job", `mcp:${workflow.id}:${body.prompt}`);
  if (!dryJobs.has(id)) dryJobs.set(id, { id, workflowId: workflow.id, workflowVersion: workflow.version, inputs: { label: `MCP · ${workflow.label}`, prompt: body.prompt, costEstimate: 1 }, state: "queued", createdAt: Date.now(), outputs: [] });
  return Response.json({ mode: adapterMode(), workflowId: workflow.id, approval: "accepted", execution: "queued", job: { id, state: "queued", costEstimate: 1 } }, { status: 202 });
}
