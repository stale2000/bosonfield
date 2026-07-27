import catalog from "../../../../workflows/manifests/catalog.json";
import { adapterMode } from "../../../../lib/comfy-adapter";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { workflowId?: string; inputs?: Record<string, unknown> };
  const workflow = catalog.find((entry) => entry.id === body.workflowId);
  if (!workflow) return Response.json({ error: { code: "WORKFLOW_NOT_FOUND", message: "Unknown workflow" } }, { status: 404 });
  const inputs = body.inputs ?? {};
  const count = typeof inputs.count === "number" ? Math.min(Math.max(inputs.count, 1), 4) : 1;
  const duration = typeof inputs.duration === "number" ? Math.min(Math.max(inputs.duration, 1), 30) : 5;
  return Response.json({ mode: adapterMode(), workflowId: workflow.id, valid: true, estimate: { credits: count * (workflow.capability.startsWith("video") ? duration : 1), seconds: workflow.capability.startsWith("video") ? duration * 3 : 2, range: { credits: [count, count * Math.max(duration, 1)], seconds: [1, duration * 5] } } });
}
