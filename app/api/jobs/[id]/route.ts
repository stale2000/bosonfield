type RouteContext = { params: Promise<{ id: string }> };
import { dryJobs, materializeComfyOutputs, materializeDryJob } from "../../_dry-data";
import { ComfyUIHttpAdapter, adapterMode, comfyBaseUrl, comfyNeedsOutputProxy, normalizeComfyHistory } from "../../../../lib/comfy-adapter";
import { releaseReservation } from "../../_credits";

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id.startsWith("dry_")) {
    return Response.json({ error: { code: "JOB_NOT_FOUND", message: `Unknown job: ${id}` } }, { status: 404 });
  }
  const job = dryJobs.get(id);
  if (!job) return Response.json({ error: { code: "JOB_NOT_FOUND", message: `Unknown job: ${id}` } }, { status: 404 });
  if (adapterMode() === "comfyui" && job.comfyPromptId) {
    try {
      const baseUrl = comfyBaseUrl()!;
      const history = await new ComfyUIHttpAdapter(baseUrl).history(job.comfyPromptId);
      const record = history[job.comfyPromptId] as { status?: { status_str?: string; completed?: boolean } } | undefined;
      job.outputFiles = normalizeComfyHistory(history, job.comfyPromptId, baseUrl).map((file) => comfyNeedsOutputProxy() ? { ...file, url: `/api/jobs/${encodeURIComponent(id)}/output?${new URLSearchParams({ filename: file.filename, subfolder: file.subfolder, type: file.type }).toString()}` } : file);
      const status = typeof record?.status?.status_str === "string" ? record.status.status_str.toLowerCase() : "";
      // Comfy marks finished error records as completed too; failure must win.
      if (["error", "failed", "execution_error"].includes(status)) job.state = "failed";
      else if (["success", "succeeded"].includes(status) || record?.status?.completed) job.state = "complete";
      else if (job.state !== "cancelled") job.state = "running";
      if (job.state === "failed" && typeof job.inputs.reservationId === "string") releaseReservation(job.inputs.reservationId);
      if (job.state === "complete" && job.outputFiles.length) materializeComfyOutputs(job, job.outputFiles);
    } catch { /* keep last known state when the worker is temporarily unavailable */ }
  } else materializeDryJob(job);
  return Response.json({
    job: {
      ...job,
      reservationId: typeof job.inputs.reservationId === "string" ? job.inputs.reservationId : null,
      costEstimate: typeof job.inputs.costEstimate === "number" ? job.inputs.costEstimate : 0,
      mode: adapterMode(),
      progress: { completed: job.state === "complete" ? 1 : 0, total: 1 },
      message: adapterMode() === "comfyui"
        ? "ComfyUI-backed job state; history is reconciled from the configured worker."
        : "Dry-run job state. No model or GPU was started.",
    },
  });
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id.startsWith("dry_")) {
    return Response.json({ error: { code: "JOB_NOT_FOUND", message: `Unknown job: ${id}` } }, { status: 404 });
  }
  const job = dryJobs.get(id);
  if (!job) return Response.json({ error: { code: "JOB_NOT_FOUND", message: `Unknown job: ${id}` } }, { status: 404 });
  if (adapterMode() === "comfyui" && job.comfyPromptId) {
    try { await new ComfyUIHttpAdapter(comfyBaseUrl()!).interrupt(job.comfyPromptId); } catch { /* preserve cancellation intent locally */ }
  }
  job.state = "cancelled";
  const reservation = typeof job.inputs.reservationId === "string" ? releaseReservation(job.inputs.reservationId) : null;
  delete job.inputs.reservationId;
  return Response.json({ job: { ...job, reservationId: null, costEstimate: typeof job.inputs.costEstimate === "number" ? job.inputs.costEstimate : 0, mode: adapterMode(), creditRelease: reservation ? "released" : "none" } });
}
