type RouteContext = { params: Promise<{ id: string }> };
import { dryJobs, stableDryId } from "../../../_dry-data";

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id.startsWith("dry_")) {
    return Response.json({ error: { code: "JOB_NOT_FOUND", message: `Unknown job: ${id}` } }, { status: 404 });
  }
  const source = dryJobs.get(id);
  if (!source) return Response.json({ error: { code: "JOB_NOT_FOUND", message: `Unknown job: ${id}` } }, { status: 404 });
  const retryId = stableDryId("job", `${id}:retry`);
  const retrySource = { ...source, inputs: { ...source.inputs } };
  delete retrySource.inputs.reservationId;
  delete retrySource.comfyPromptId;
  dryJobs.set(retryId, { ...retrySource, id: retryId, state: "queued", createdAt: Date.now(), outputs: [] });
  return Response.json({
    job: {
      id: retryId,
      sourceJobId: id,
      state: "queued",
      mode: "dry-run",
      reservationId: null,
      costEstimate: typeof source.inputs.costEstimate === "number" ? source.inputs.costEstimate : 0,
      message: "Retry queued without starting a model or GPU.",
    },
  }, { status: 202 });
}
