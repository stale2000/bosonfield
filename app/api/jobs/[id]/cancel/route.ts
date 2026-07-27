import { adapterMode, comfyBaseUrl, ComfyUIHttpAdapter } from "../../../../../lib/comfy-adapter";
import { dryJobs } from "../../../_dry-data";
import { releaseReservation } from "../../../_credits";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id.startsWith("dry_")) return Response.json({ error: { code: "JOB_NOT_FOUND", message: `Unknown job: ${id}` } }, { status: 404 });
  const job = dryJobs.get(id);
  if (!job) return Response.json({ error: { code: "JOB_NOT_FOUND", message: `Unknown job: ${id}` } }, { status: 404 });
  if (adapterMode() === "comfyui" && job.comfyPromptId) {
    try { await new ComfyUIHttpAdapter(comfyBaseUrl()!).interrupt(job.comfyPromptId); } catch { /* preserve cancellation intent locally */ }
  }
  job.state = "cancelled";
  const reservation = typeof job.inputs.reservationId === "string" ? releaseReservation(job.inputs.reservationId) : null;
  delete job.inputs.reservationId;
  return Response.json({ job: { ...job, reservationId: null, costEstimate: typeof job.inputs.costEstimate === "number" ? job.inputs.costEstimate : 0, mode: adapterMode(), cancellation: "acknowledged", creditRelease: reservation ? "released" : "none" } });
}
