import catalog from "../../../workflows/manifests/catalog.json";
import iceStatueGraph from "../../../workflows/graphs/viral/ice-statue/v1.json";
import sketchToFabricGraph from "../../../workflows/graphs/viral/sketch-to-fabric/v1.json";
import { adapterMode, validateApiPrompt } from "../../../lib/comfy-adapter";
import { savedWorkflows as saved, type SavedWorkflow } from "../../../lib/workflow-store";

export function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const workflow = saved.get(id) ?? catalog.find((entry) => entry.id === id);
    if (!workflow) {
      return Response.json({ error: { code: "WORKFLOW_NOT_FOUND", message: `Unknown workflow: ${id}` } }, { status: 404 });
    }
    const resolved = workflow.id === "viral-ice-statue"
      ? { ...workflow, graph: iceStatueGraph }
      : workflow.id === "viral-sketch-to-fabric"
        ? { ...workflow, graph: sketchToFabricGraph }
        : workflow;
    return Response.json({ workflow: resolved, mode: adapterMode() });
  }

  const published = new URL(request.url).searchParams.get("published");
  const custom = [...saved.values()].filter((workflow) => published !== "true" || workflow.published);
  return Response.json({ workflows: [...catalog, ...custom], mode: adapterMode() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { id?: string; label?: string; description?: string; graph?: Record<string, unknown>; published?: boolean };
  if (!body.label?.trim() || !body.graph || typeof body.graph !== "object" || !validateApiPrompt(body.graph)) return Response.json({ error: { code: "INPUT_INVALID", message: "label and a valid ComfyUI API graph are required" } }, { status: 400 });
  const id = body.id?.trim() || `wf_${Date.now().toString(36)}`;
  const workflow: SavedWorkflow = { id, label: body.label.trim(), description: body.description?.trim() ?? "", graph: body.graph, published: Boolean(body.published), updatedAt: new Date().toISOString() };
  saved.set(id, workflow);
  return Response.json({ workflow, mode: adapterMode() }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({})) as { id?: string; label?: string; description?: string; graph?: Record<string, unknown>; published?: boolean };
  if (!body.id || !saved.has(body.id)) return Response.json({ error: { code: "WORKFLOW_NOT_FOUND", message: "Saved workflow not found" } }, { status: 404 });
  const current = saved.get(body.id)!;
  if (body.graph && (typeof body.graph !== "object" || !validateApiPrompt(body.graph))) return Response.json({ error: { code: "INPUT_INVALID", message: "graph must be a valid ComfyUI API graph" } }, { status: 400 });
  const workflow = { ...current, label: body.label?.trim() || current.label, description: body.description?.trim() ?? current.description, graph: body.graph && typeof body.graph === "object" ? body.graph : current.graph, published: typeof body.published === "boolean" ? body.published : current.published, updatedAt: new Date().toISOString() };
  saved.set(body.id, workflow);
  return Response.json({ workflow, mode: adapterMode() });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !saved.delete(id)) return Response.json({ error: { code: "WORKFLOW_NOT_FOUND", message: "Saved workflow not found" } }, { status: 404 });
  return Response.json({ deleted: id });
}
