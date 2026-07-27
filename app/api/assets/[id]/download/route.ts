import { dryAssets } from "../../../_dry-data";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const asset = dryAssets.find((entry) => entry.id === id);
  if (!asset) return Response.json({ error: { code: "ASSET_NOT_FOUND", message: `Unknown asset: ${id}` } }, { status: 404 });
  if (asset.state !== "ready") return Response.json({ error: { code: "ASSET_NOT_READY", message: `Asset is not ready: ${id}` } }, { status: 409 });
  const payload = { format: "bosonfield-dry-asset", exportedAt: new Date().toISOString(), asset, note: "Dry mode exports provenance metadata; no media bytes or model files are included." };
  return new Response(JSON.stringify(payload, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="${asset.id}.json"` } });
}
