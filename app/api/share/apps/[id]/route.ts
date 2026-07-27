import { appById } from "../../../../../lib/apps";
import { isExternalComfyUrl } from "../../../../../lib/external-links";
import { isVerifiedPresetLink, showcaseLinks } from "../../../../../lib/showcase-links";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const app = appById(id);
  if (!app) return Response.json({ error: { code: "APP_NOT_FOUND", message: "Unknown app" } }, { status: 404 });
  const configuredUrl = showcaseLinks("apps").get(app.id) ?? app.comfyAppUrl;
  const presetId = app.group === "Viral Presets" ? `preset_${app.id.replace(/^app_viral_/, "")}` : null;
  if (presetId && !isVerifiedPresetLink(presetId, configuredUrl)) return Response.json({ error: { code: "SHARE_LINK_NOT_VERIFIED", message: "This viral preset has a workflow share, but no verified Comfy App Mode link" } }, { status: 409 });
  const link = isExternalComfyUrl(configuredUrl) ? configuredUrl.trim() : null;
  if (!link) return Response.json({ error: { code: "SHARE_LINK_NOT_CONFIGURED", message: "No external Comfy app is configured for this record" } }, { status: 409 });
  return Response.redirect(link, 302);
}
