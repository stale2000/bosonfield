import { dryJobs } from "../../../_dry-data";
import { adapterMode, ComfyUIHttpAdapter, DryComfyAdapter, comfyBaseUrl } from "../../../../../lib/comfy-adapter";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id.startsWith("dry_")) return Response.json({ error: { code: "JOB_NOT_FOUND", message: `Unknown job: ${id}` } }, { status: 404 });
  const job = dryJobs.get(id);
  if (!job) return Response.json({ error: { code: "JOB_NOT_FOUND", message: `Unknown job: ${id}` } }, { status: 404 });
  if (adapterMode() === "dry-run") return Response.json({ mode: "dry-run", jobId: id, transport: "deterministic", events: new DryComfyAdapter().events() });
  let state: "queued" | "running" | "succeeded" | "failed" | "cancelled" = job.state === "cancelled" ? "cancelled" : "queued";
  let message = "Waiting for ComfyUI history.";
  let completed = 0;
  try {
    if (!job.comfyPromptId) throw new Error("COMFY_PROMPT_NOT_FOUND");
    const history = await new ComfyUIHttpAdapter(comfyBaseUrl()!).history(job.comfyPromptId);
    const record = history[job.comfyPromptId] as { status?: { status_str?: unknown; completed?: unknown } } | undefined;
    const status = typeof record?.status?.status_str === "string" ? record.status.status_str.toLowerCase() : "";
    // Comfy marks finished error records as completed too; failure must win.
    if (["error", "failed", "execution_error"].includes(status)) {
      state = "failed"; message = "ComfyUI execution failed.";
    } else if (record?.status?.completed === true || status === "success" || status === "succeeded") {
      state = "succeeded"; completed = 1; message = "ComfyUI execution completed.";
    } else if (record) {
      state = "running"; message = "ComfyUI execution is running.";
    }
  } catch {
    // Keep a stable snapshot when the worker is temporarily unavailable.
    state = job.state === "complete" ? "succeeded" : job.state === "failed" ? "failed" : job.state === "cancelled" ? "cancelled" : job.state === "running" ? "running" : "queued";
    completed = state === "succeeded" ? 1 : 0;
    message = "ComfyUI history is temporarily unavailable.";
  }
  return Response.json({ mode: "comfyui", jobId: id, transport: "history", events: [{ state, completed, total: 1, message }] });
}
