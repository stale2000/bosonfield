import { viralPresetCatalog } from "../../../../lib/presets";
import catalog from "../../../../workflows/manifests/catalog.json";
import { isExternalComfyUrl } from "../../../../lib/external-links";
import { showcaseLinks } from "../../../../lib/showcase-links";

type AdminPreset = { id: string; name: string; capability: string; status: string };
type PresetRuntime = typeof globalThis & { __bosonfieldAdminPresets?: AdminPreset[] };
const runtime = globalThis as PresetRuntime;
export const presets = runtime.__bosonfieldAdminPresets ?? (runtime.__bosonfieldAdminPresets = [
  { id: "preset_cinematic_01", name: "Cinematic drift", capability: "video-motion", status: "draft" },
  { id: "preset_portrait_01", name: "Soft portrait", capability: "image-basic", status: "verified" },
]);

export async function GET() { return Response.json({ mode: "dry-run", presets }); }

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { name?: string; capability?: string };
  if (!body.name?.trim() || !body.capability?.trim()) return Response.json({ error: { code: "INPUT_INVALID", message: "name and capability are required" } }, { status: 400 });
  const preset = { id: `preset_dry_${Date.now()}`, name: body.name.trim(), capability: body.capability.trim(), status: "draft" };
  presets.push(preset);
  return Response.json({ mode: "dry-run", preset }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { presetId?: string; name?: string; capability?: string; comfyAppUrl?: string | null };
  const preset = viralPresetCatalog.find((entry) => entry.id === body.presetId);
  const adminPreset = presets.find((entry) => entry.id === body.presetId);
  const workflow = catalog.find((entry) => `preset_${entry.id}` === body.presetId);
  if (!preset && !adminPreset && !workflow) return Response.json({ error: { code: "PRESET_NOT_FOUND", message: "Unknown preset" } }, { status: 404 });
  const links = showcaseLinks("presets");
  const presetId = preset?.id ?? adminPreset?.id ?? `preset_${workflow!.id}`;
  const comfyAppUrl = body.comfyAppUrl === null ? null : body.comfyAppUrl?.trim();
  if (comfyAppUrl !== undefined && comfyAppUrl !== null && !isExternalComfyUrl(comfyAppUrl)) return Response.json({ error: { code: "INPUT_INVALID", message: "comfyAppUrl must be a safe http(s) URL or null" } }, { status: 400 });
  if (adminPreset) {
    if (body.name !== undefined && !body.name.trim()) return Response.json({ error: { code: "INPUT_INVALID", message: "name cannot be empty" } }, { status: 400 });
    if (body.name?.trim()) adminPreset.name = body.name.trim();
    if (body.capability?.trim()) adminPreset.capability = body.capability.trim();
  }
  if (comfyAppUrl !== undefined) {
    if (comfyAppUrl) links.set(presetId, comfyAppUrl);
    else links.delete(presetId);
  }
  const resolvedUrl = links.get(presetId) ?? (preset?.comfyAppUrl ?? null);
  const record = preset ? { ...preset, catalogPath: `/?preset=${encodeURIComponent(presetId)}`, sharePath: `/api/share/presets/${encodeURIComponent(presetId)}`, comfyAppUrl: resolvedUrl } : adminPreset ? { ...adminPreset, title: adminPreset.name, kind: "admin", catalogPath: `/?preset=${encodeURIComponent(presetId)}`, sharePath: `/api/share/presets/${encodeURIComponent(presetId)}`, comfyAppUrl: resolvedUrl } : { id: presetId, workflowId: workflow!.id, title: workflow!.label, status: workflow!.status, catalogPath: `/?preset=${encodeURIComponent(presetId)}`, sharePath: `/api/share/presets/${encodeURIComponent(presetId)}`, comfyAppUrl: resolvedUrl };
  return Response.json({ mode: "dry-run", preset: record });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const index = presets.findIndex((entry) => entry.id === id);
  if (index < 0) return Response.json({ error: { code: "PRESET_NOT_FOUND", message: "Custom preset not found" } }, { status: 404 });
  const [deleted] = presets.splice(index, 1);
  showcaseLinks("presets").delete(id!);
  return Response.json({ mode: "dry-run", deleted: deleted.id });
}
