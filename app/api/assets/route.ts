import { deletedDryAssetIds, dryAssets, invalid, stableDryId, type DryAsset } from "../_dry-data";

type AssetRequest = { name?: string; kind?: DryAsset["kind"]; mimeType?: string; sizeBytes?: number; idempotencyKey?: string };
const kinds = new Set<DryAsset["kind"]>(["image", "video", "audio", "reference"]);

export function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get("kind");
  if (kind && !kinds.has(kind as DryAsset["kind"])) return invalid("kind must be image, video, audio, or reference");
  const assets = kind ? dryAssets.filter((asset) => asset.kind === kind) : dryAssets;
  return Response.json({ assets, nextCursor: null, mode: "dry-run" });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AssetRequest;
  if (typeof body.name !== "string" || !body.name.trim()) return invalid("name is required");
  if (typeof body.kind !== "string" || !kinds.has(body.kind as DryAsset["kind"])) return invalid("kind must be image, video, audio, or reference");
  if (typeof body.mimeType !== "string" || !body.mimeType.includes("/")) return invalid("mimeType is required");
  if (body.sizeBytes !== undefined && (!Number.isInteger(body.sizeBytes) || body.sizeBytes < 0)) return invalid("sizeBytes must be a non-negative integer");
  if (body.idempotencyKey !== undefined && (typeof body.idempotencyKey !== "string" || body.idempotencyKey.length > 128)) return invalid("idempotencyKey must be at most 128 characters");
  const id = stableDryId("asset", body.idempotencyKey ?? `${body.name}:${body.mimeType}`);
  const existing = dryAssets.find((entry) => entry.id === id);
  if (existing) return Response.json({ asset: existing, upload: { method: "PUT", url: null, expiresAt: null }, mode: "dry-run" }, { status: 201 });
  deletedDryAssetIds.delete(id);
  const asset: DryAsset = { id, name: body.name.trim(), kind: body.kind as DryAsset["kind"], mimeType: body.mimeType, state: "uploading", visibility: "private", sizeBytes: body.sizeBytes ?? 0, previewUrl: null, createdAt: "2026-01-01T00:00:00.000Z" };
  dryAssets.push(asset);
  return Response.json({ asset, upload: { method: "PUT", url: null, expiresAt: null }, mode: "dry-run", message: "No file was uploaded. Complete this session with a storage adapter when enabled." }, { status: 201 });
}
