type RouteContext = { params: Promise<{ id: string }> };
import { dryJobs, stableDryId } from "../../../_dry-data";

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id.startsWith("dry_")) {
    return Response.json({ error: { code: "JOB_NOT_FOUND", message: `Unknown job: ${id}` } }, { status: 404 });
  }
  const source = dryJobs.get(id);
  if (!source) return Response.json({ error: { code: "JOB_NOT_FOUND", message: `Unknown job: ${id}` } }, { status: 404 });
  const draftId = stableDryId("job", `${id}:draft`);
  const draftSource = { ...source, inputs: { ...source.inputs } };
  delete draftSource.inputs.reservationId;
  delete draftSource.comfyPromptId;
  dryJobs.set(draftId, { ...draftSource, id: draftId, state: "queued", createdAt: Date.now(), outputs: [] });
  return Response.json({
    draft: {
      id: draftId,
      sourceJobId: id,
      mode: "dry-run",
      editable: true,
      reservationId: null,
      costEstimate: typeof source.inputs.costEstimate === "number" ? source.inputs.costEstimate : 0,
      inputs: draftSource.inputs,
      message: "Editable dry-run request created without starting a model or GPU.",
    },
  }, { status: 201 });
}
