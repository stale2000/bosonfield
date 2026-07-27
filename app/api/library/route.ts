import { dryAssets, dryProjects } from "../_dry-data";

function assetCategories(asset: (typeof dryAssets)[number]) {
  const workflowId = asset.provenance?.workflowId ?? (asset.kind === "image" ? "image-basic" : asset.kind === "video" ? "video-i2v" : asset.kind);
  const categories = new Set<string>([asset.kind]);
  if (asset.kind === "video" || workflowId.includes("short")) categories.add("shorts");
  if (workflowId.includes("explainer")) categories.add("explainer");
  if (workflowId.includes("campaign") || workflowId.includes("influencer")) categories.add("marketing");
  if (workflowId.includes("lipsync")) categories.add("lipsync");
  if (asset.kind === "reference" || workflowId.includes("character")) categories.add("reference");
  return [...categories];
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const kind = query.get("kind");
  const projectId = query.get("projectId");
  const project = projectId ? dryProjects.find((entry) => entry.id === projectId) : null;
  if (projectId && !project) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${projectId}` } }, { status: 404 });
  const assets = dryAssets.map((asset) => ({ ...asset, categories: assetCategories(asset), projectId: projectId ?? null, provenance: { ...(asset.provenance ?? { workflowId: asset.kind === "image" ? "image-basic" : "video-i2v" }), mode: "dry-run" } })).filter((asset) => (!kind || asset.categories.includes(kind)) && (!project || project.assetIds.includes(asset.id)));
  return Response.json({ mode: "dry-run", assets, nextCursor: null });
}
