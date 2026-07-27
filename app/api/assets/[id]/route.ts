import { deletedDryAssetIds, dryAssets, dryProjects } from "../../_dry-data";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const asset = dryAssets.find((entry) => entry.id === id);
  if (!asset) return Response.json({ error: { code: "ASSET_NOT_FOUND", message: `Unknown asset: ${id}` } }, { status: 404 });
  return Response.json({ asset, mode: "dry-run" });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const index = dryAssets.findIndex((entry) => entry.id === id);
  if (index < 0) {
    if (deletedDryAssetIds.has(id)) return Response.json({ asset: { id, state: "deleted", visibility: "private" }, mode: "dry-run" });
    return Response.json({ error: { code: "ASSET_NOT_FOUND", message: `Unknown asset: ${id}` } }, { status: 404 });
  }
  dryAssets.splice(index, 1);
  deletedDryAssetIds.add(id);
  for (const project of dryProjects) {
    project.assetIds = project.assetIds.filter((assetId) => assetId !== id);
    for (const scene of project.scenes) scene.assetIds = scene.assetIds.filter((assetId) => assetId !== id);
  }
  return Response.json({ asset: { id, state: "deleted", visibility: "private" }, mode: "dry-run" });
}
