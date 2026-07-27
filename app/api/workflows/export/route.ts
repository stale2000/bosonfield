import imageBasicGraph from "../../../../workflows/graphs/image-basic/v1.json";
import { workflowRecord } from "../../../../lib/workflow-store";

const executableGraphs: Record<string, Record<string, unknown>> = {
  "image-basic": imageBasicGraph.api as Record<string, unknown>,
};

export function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  if (!id) return Response.json({ error: { code: "WORKFLOW_ID_REQUIRED", message: "id is required" } }, { status: 400 });
  // Saved edits take precedence over a catalog template with the same id.
  const manifest = workflowRecord(id);
  if (!manifest) return Response.json({ error: { code: "WORKFLOW_NOT_FOUND", message: `Unknown workflow: ${id}` } }, { status: 404 });
  const graph = "graph" in manifest && manifest.graph && typeof manifest.graph === "object"
    ? manifest.graph as Record<string, unknown>
    : executableGraphs[id];
  if (!graph) return Response.json({ error: { code: "WORKFLOW_NOT_READY", message: `${manifest.label} has no verified API graph to export yet` }, workflow: manifest }, { status: 409 });
  return new Response(JSON.stringify(graph, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${id}.api.json"`,
      "cache-control": "no-store",
    },
  });
}
