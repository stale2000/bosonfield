import { dryAssets } from "../../../_dry-data";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const asset = dryAssets.find((entry) => entry.id === id);
  if (!asset) return Response.json({ error: { code: "ASSET_NOT_FOUND", message: `Unknown asset: ${id}` } }, { status: 404 });
  asset.state = "ready";
  return Response.json({ asset, scan: { state: "passed", mode: "dry-run" }, mode: "dry-run" });
}
