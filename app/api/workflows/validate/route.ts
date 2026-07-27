import { adapterMode, validateApiPrompt } from "../../../../lib/comfy-adapter";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { prompt?: unknown; workflowId?: string };
  if (!validateApiPrompt(body.prompt)) {
    return Response.json({ valid: false, errors: [{ code: "GRAPH_EMPTY", message: "A workflow graph object is required." }] }, { status: 400 });
  }
  return Response.json({ valid: true, workflowId: body.workflowId ?? null, errors: [], mode: adapterMode() });
}
