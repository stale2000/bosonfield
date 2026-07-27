import { dryAssets, dryProjects, invalid, stableDryId, type DryScene } from "../../../_dry-data";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const project = dryProjects.find((entry) => entry.id === id);
  if (!project) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  return Response.json({ mode: "dry-run", projectId: id, scenes: project.scenes });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const project = dryProjects.find((entry) => entry.id === id);
  if (!project) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { title?: string; brief?: string; order?: number; assetIds?: string[]; idempotencyKey?: string };
  if (typeof body.title !== "string" || !body.title.trim()) return invalid("title is required");
  if (body.brief !== undefined && typeof body.brief !== "string") return invalid("brief must be a string");
  if (body.order !== undefined && (!Number.isInteger(body.order) || body.order < 0)) return invalid("order must be a non-negative integer");
  if (body.assetIds !== undefined && (!Array.isArray(body.assetIds) || body.assetIds.some((assetId) => typeof assetId !== "string"))) return invalid("assetIds must be an array of strings");
  const missingAssetId = body.assetIds?.find((assetId) => !dryAssets.some((asset) => asset.id === assetId));
  if (missingAssetId) return Response.json({ error: { code: "ASSET_NOT_FOUND", message: `Unknown asset: ${missingAssetId}` } }, { status: 404 });
  const pendingAssetId = body.assetIds?.find((assetId) => dryAssets.find((asset) => asset.id === assetId)?.state !== "ready");
  if (pendingAssetId) return Response.json({ error: { code: "ASSET_NOT_READY", message: `Asset is not ready: ${pendingAssetId}` } }, { status: 409 });
  const sceneId = stableDryId("scene", body.idempotencyKey ?? `${id}:${body.title}`);
  const existing = project.scenes.find((entry) => entry.id === sceneId);
  if (existing) return Response.json({ scene: existing, projectId: id, mode: "dry-run" }, { status: 201 });
  const scene: DryScene = { id: sceneId, title: body.title.trim(), brief: body.brief?.trim() ?? "", order: body.order ?? 0, status: "draft", assetIds: body.assetIds ?? [] };
  project.scenes.push(scene);
  project.updatedAt = new Date().toISOString();
  return Response.json({ scene, projectId: id, mode: "dry-run" }, { status: 201 });
}
