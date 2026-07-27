import { dryAssets, dryProjects, invalid } from "../../../_dry-data";

type CanvasNode = { id: string; type: string; x: number; y: number; assetId?: string };
type CanvasRuntime = typeof globalThis & { __bosonfieldCanvases?: Map<string, CanvasNode[]> };
const runtime = globalThis as CanvasRuntime;
const canvases = runtime.__bosonfieldCanvases ?? (runtime.__bosonfieldCanvases = new Map([["project_dry_01", [{ id: "canvas_node_01", type: "scene", x: 120, y: 80, assetId: "asset_dry_image_01" }]]]));

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!dryProjects.some((project) => project.id === id)) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  return Response.json({ mode: "dry-run", projectId: id, nodes: canvases.get(id) ?? [] });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const project = dryProjects.find((entry) => entry.id === id);
  if (!project) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { type?: string; x?: number; y?: number; assetId?: string };
  if (!body.type?.trim()) return Response.json({ error: { code: "INPUT_INVALID", message: "type is required" } }, { status: 400 });
  if ((body.x !== undefined && !Number.isFinite(body.x)) || (body.y !== undefined && !Number.isFinite(body.y))) return invalid("x and y must be finite numbers");
  const asset = body.assetId ? dryAssets.find((entry) => entry.id === body.assetId) : undefined;
  if (body.assetId && !asset) return Response.json({ error: { code: "ASSET_NOT_FOUND", message: `Unknown asset: ${body.assetId}` } }, { status: 404 });
  if (asset && asset.state !== "ready") return Response.json({ error: { code: "ASSET_NOT_READY", message: `Asset is not ready: ${body.assetId}` } }, { status: 409 });
  const node = { id: `canvas_node_${Date.now()}`, type: body.type.trim(), x: body.x ?? 0, y: body.y ?? 0, assetId: body.assetId };
  canvases.set(id, [...(canvases.get(id) ?? []), node]);
  if (body.assetId && !project.assetIds.includes(body.assetId)) project.assetIds.push(body.assetId);
  project.updatedAt = new Date().toISOString();
  return Response.json({ mode: "dry-run", projectId: id, node }, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!dryProjects.some((project) => project.id === id)) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { id?: string; type?: string; x?: number; y?: number };
  const node = (canvases.get(id) ?? []).find((entry) => entry.id === body.id);
  if (!node) return Response.json({ error: { code: "CANVAS_NODE_NOT_FOUND", message: "Canvas node not found" } }, { status: 404 });
  if (!body.type?.trim()) return Response.json({ error: { code: "INPUT_INVALID", message: "type is required" } }, { status: 400 });
  if ((body.x !== undefined && !Number.isFinite(body.x)) || (body.y !== undefined && !Number.isFinite(body.y))) return invalid("x and y must be finite numbers");
  node.type = body.type.trim(); node.x = body.x ?? node.x; node.y = body.y ?? node.y;
  return Response.json({ mode: "dry-run", projectId: id, node });
}
