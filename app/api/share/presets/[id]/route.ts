import catalog from "../../../../../workflows/manifests/catalog.json";
import { viralPresetCatalog } from "../../../../../lib/presets";
import { isVerifiedPresetLink, showcaseLinks } from "../../../../../lib/showcase-links";
import { isExternalComfyUrl } from "../../../../../lib/external-links";
import { presets as adminPresets } from "../../../admin/presets/route";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const preset = viralPresetCatalog.find((entry) => entry.id === id);
  const adminPreset = adminPresets.find((entry) => entry.id === id);
  const workflow = catalog.find((entry) => `preset_${entry.id}` === id);
  if (!preset && !adminPreset && !workflow) return Response.json({ error: { code: "PRESET_NOT_FOUND", message: "Unknown preset" } }, { status: 404 });
  const configuredUrl = showcaseLinks("presets").get(id) ?? preset?.comfyAppUrl;
  // Hash-tagged catalog fallbacks are direct card destinations, not published share records.
  const link = configuredUrl && !configuredUrl.includes("#preset=") && (preset ? isVerifiedPresetLink(id, configuredUrl) : isExternalComfyUrl(configuredUrl)) ? configuredUrl.trim() : null;
  if (!link) return Response.json({ error: { code: "SHARE_LINK_NOT_CONFIGURED", message: "No external Comfy link is configured for this preset" } }, { status: 409 });
  return Response.redirect(link, 302);
}
