import { dryAssets, dryProjects } from "../../../_dry-data";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const project = dryProjects.find((entry) => entry.id === id);
  if (!project) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  const assets = project.assetIds.map((assetId) => dryAssets.find((asset) => asset.id === assetId)).filter(Boolean).map((asset) => ({ ...asset, projectId: id, provenance: { mode: "dry-run", relationship: "attached" } }));
  return Response.json({ mode: "dry-run", projectId: id, assets });
}
