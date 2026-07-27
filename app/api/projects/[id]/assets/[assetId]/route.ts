import { dryAssets, dryProjects } from "../../../../_dry-data";

type RouteContext = { params: Promise<{ id: string; assetId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id, assetId } = await context.params;
  const project = dryProjects.find((entry) => entry.id === id);
  if (!project) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  const asset = dryAssets.find((entry) => entry.id === assetId);
  if (!asset) return Response.json({ error: { code: "ASSET_NOT_FOUND", message: `Unknown asset: ${assetId}` } }, { status: 404 });
  if (asset.state !== "ready") return Response.json({ error: { code: "ASSET_NOT_READY", message: `Asset is not ready: ${assetId}` } }, { status: 409 });
  const body = (await request.json().catch(() => ({}))) as { relationship?: "reference" | "output"; sceneId?: string };
  const scene = body.sceneId ? project.scenes.find((entry) => entry.id === body.sceneId) : undefined;
  if (body.sceneId && !scene) return Response.json({ error: { code: "SCENE_NOT_FOUND", message: `Unknown scene: ${body.sceneId}` } }, { status: 404 });
  if (!project.assetIds.includes(assetId)) project.assetIds.push(assetId);
  if (scene && !scene.assetIds.includes(assetId)) scene.assetIds.push(assetId);
  project.updatedAt = new Date().toISOString();
  return Response.json({ projectId: id, assetId, relationship: body.relationship ?? "reference", sceneId: body.sceneId ?? null, mode: "dry-run" }, { status: 201 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id, assetId } = await context.params;
  const project = dryProjects.find((entry) => entry.id === id);
  if (!project) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  if (!project.assetIds.includes(assetId)) return Response.json({ error: { code: "ATTACHMENT_NOT_FOUND", message: `Asset is not attached: ${assetId}` } }, { status: 404 });
  project.assetIds = project.assetIds.filter((entry) => entry !== assetId);
  for (const scene of project.scenes) scene.assetIds = scene.assetIds.filter((entry) => entry !== assetId);
  project.updatedAt = new Date().toISOString();
  return Response.json({ projectId: id, assetId, detached: true, mode: "dry-run" });
}
