import { ComfyUIHttpAdapter, DryComfyAdapter, adapterMode, comfyBaseUrl, compileComfyPrompt, validateWorkflowInputs } from "../../../lib/comfy-adapter";
import imageBasicGraph from "../../../workflows/graphs/image-basic/v1.json";
import { dryJobs, materializeDryJob } from "../_dry-data";
import { workflowRecord } from "../../../lib/workflow-store";

export async function GET() {
  const mode = adapterMode();
  const jobs = [...dryJobs.values()].map((job) => mode === "dry-run" ? materializeDryJob(job) : job).map((job) => ({ ...job, reservationId: typeof job.inputs.reservationId === "string" ? job.inputs.reservationId : null, costEstimate: typeof job.inputs.costEstimate === "number" ? job.inputs.costEstimate : 0, label: typeof job.inputs.label === "string" ? job.inputs.label : job.workflowId, mode }));
  return Response.json({ mode, jobs });
}

type JobRequest = {
  workflowId?: string;
  inputs?: Record<string, unknown>;
  idempotencyKey?: string;
};

function stableId(workflowId: string, idempotencyKey?: string) {
  if (!idempotencyKey) return `dry_${crypto.randomUUID()}`;
  let hash = 2166136261;
  for (const character of `${workflowId}:${idempotencyKey}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `dry_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as JobRequest;
  if (typeof body.workflowId !== "string" || !body.workflowId.trim()) {
    return Response.json({ error: { code: "INPUT_INVALID", message: "workflowId is required" } }, { status: 400 });
  }
  const workflow = workflowRecord(body.workflowId);
  if (!workflow) {
    return Response.json({ error: { code: "WORKFLOW_NOT_FOUND", message: `Unknown workflow: ${body.workflowId}` } }, { status: 404 });
  }
  if (body.inputs !== undefined && (typeof body.inputs !== "object" || body.inputs === null || Array.isArray(body.inputs))) {
    return Response.json({ error: { code: "INPUT_INVALID", message: "inputs must be an object" } }, { status: 400 });
  }
  // UI metadata identifies the selected custom workflow; it is not a workflow control.
  const inputs = { ...(body.inputs ?? {}) };
  delete inputs.workflowId;
  delete inputs.workflowSource;
  const inputValidation = validateWorkflowInputs(workflow, inputs);
  if (!inputValidation.valid) {
    return Response.json({ error: { code: "INPUT_INVALID", message: inputValidation.errors.join("; ") } }, { status: 400 });
  }
  if (["audio-lipsync", "video-recast", "character-profile", "ai-influencer"].includes(workflow.id) && inputs.consent !== true) {
    return Response.json({ error: { code: "CONSENT_REQUIRED", message: "Identity workflows require consent for the referenced person." } }, { status: 400 });
  }
  const characterAssetIds = Array.isArray(inputs.characterAssetId) ? inputs.characterAssetId.filter((value) => typeof value === "string" && value.trim()) : inputs.characterAssetId;
  const hasCharacterAsset = Array.isArray(characterAssetIds) ? characterAssetIds.length > 0 : typeof characterAssetIds === "string" && characterAssetIds.trim().length > 0;
  const hasAudioAsset = typeof inputs.audioAssetId === "string" && inputs.audioAssetId.trim().length > 0;
  if (workflow.id === "audio-lipsync" && (!hasCharacterAsset || !hasAudioAsset)) {
    return Response.json({ error: { code: "ASSET_REQUIRED", message: "Lipsync requires a character asset and an owned audio asset." } }, { status: 400 });
  }
  if (body.idempotencyKey !== undefined && (typeof body.idempotencyKey !== "string" || body.idempotencyKey.length > 128)) {
    return Response.json({ error: { code: "INPUT_INVALID", message: "idempotencyKey must be at most 128 characters" } }, { status: 400 });
  }

  const jobId = stableId(body.workflowId, body.idempotencyKey);
  const existing = dryJobs.get(jobId);
  if (existing) {
    const mode = adapterMode();
    return Response.json({ job: { ...existing, reservationId: typeof existing.inputs.reservationId === "string" ? existing.inputs.reservationId : null, label: typeof existing.inputs.label === "string" ? existing.inputs.label : workflow.label, mode, adapter: mode, capability: workflow.capability, outputs: existing.outputs, costEstimate: typeof existing.inputs.costEstimate === "number" ? existing.inputs.costEstimate : 0, message: mode === "comfyui" ? "Queued on the configured ComfyUI worker." : "No model or GPU was started. Replace this adapter with ComfyUI /prompt when a verified workflow is enabled." } }, { status: 202 });
  }
  let prompt = new DryComfyAdapter().queue(workflow.id, workflow.version, inputs);
  let comfyPromptId: string | null = null;
  if (adapterMode() === "comfyui") {
    try {
      const graph = workflow.id === "image-basic" ? imageBasicGraph.api : "graph" in workflow && workflow.graph && typeof workflow.graph === "object" ? workflow.graph : undefined;
      if (!graph) return Response.json({ error: { code: "WORKFLOW_NOT_READY", message: `${workflow.label} has no verified ComfyUI API graph` } }, { status: 409 });
      if (workflow.id.startsWith("wf_")) return Response.json({ error: { code: "WORKFLOW_NOT_READY", message: `${workflow.label} must be verified before configured ComfyUI execution` } }, { status: 409 });
      prompt = compileComfyPrompt(graph, inputs, { workflowId: workflow.id, workflowVersion: workflow.version });
      comfyPromptId = (await new ComfyUIHttpAdapter(comfyBaseUrl()!).queue(prompt)).prompt_id;
    } catch (error) {
      return Response.json({ error: { code: "WORKER_UNAVAILABLE", message: error instanceof Error ? error.message : "ComfyUI worker unavailable" } }, { status: 503 });
    }
  }
  dryJobs.set(jobId, { id: jobId, workflowId: body.workflowId, workflowVersion: workflow.version, inputs, state: "queued", createdAt: Date.now(), outputs: [], ...(comfyPromptId ? { comfyPromptId } : {}) });
  return Response.json({
    job: {
      id: jobId,
      label: typeof inputs.label === "string" ? inputs.label : workflow.label,
      workflowId: body.workflowId,
      workflowVersion: workflow.version,
      capability: workflow.capability,
      state: "queued",
      mode: adapterMode(),
      comfyPromptId,
      promptPrepared: Boolean(prompt.prompt),
      adapter: adapterMode(),
      inputs,
      idempotencyKey: body.idempotencyKey ?? null,
      reservationId: typeof inputs.reservationId === "string" ? inputs.reservationId : null,
      costEstimate: typeof inputs.costEstimate === "number" ? inputs.costEstimate : 0,
      message: adapterMode() === "comfyui" ? "Queued on the configured ComfyUI worker." : "No model or GPU was started. Replace this adapter with ComfyUI /prompt when a verified workflow is enabled.",
    },
  }, { status: 202 });
}
