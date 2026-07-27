import { allUsecaseApps, appById } from "../../../lib/apps";
import { isExternalComfyUrl } from "../../../lib/external-links";
import { isVerifiedPresetLink, showcaseLinks } from "../../../lib/showcase-links";

export const links = showcaseLinks("apps");

export function GET() {
  const apps = allUsecaseApps().map((app) => { const configuredUrl = links.get(app.id) ?? app.comfyAppUrl; const presetId = app.group === "Viral Presets" ? `preset_${app.id.replace(/^app_viral_/, "")}` : null; const comfyAppUrl = presetId ? (isVerifiedPresetLink(presetId, configuredUrl) ? configuredUrl.trim() : null) : (isExternalComfyUrl(configuredUrl) ? configuredUrl.trim() : null); return { ...app, catalogPath: `/?app=${encodeURIComponent(app.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`, sharePath: `/api/share/apps/${encodeURIComponent(app.id)}`, comfyAppUrl }; });
  return Response.json({ mode: "dry-run", apps, linkedCount: apps.filter((app) => app.comfyAppUrl).length, unlinkedCount: apps.filter((app) => !app.comfyAppUrl).length });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({})) as { appId?: string; comfyAppUrl?: string | null };
  const app = body.appId ? appById(body.appId) : undefined;
  if (!app) return Response.json({ error: { code: "APP_NOT_FOUND", message: "Unknown app" } }, { status: 404 });
  const comfyAppUrl = body.comfyAppUrl === null ? null : body.comfyAppUrl?.trim();
  if (comfyAppUrl !== null && !isExternalComfyUrl(comfyAppUrl)) return Response.json({ error: { code: "INPUT_INVALID", message: "comfyAppUrl must be a safe http(s) URL or null" } }, { status: 400 });
  if (comfyAppUrl) links.set(app.id, comfyAppUrl); else links.delete(app.id);
  return Response.json({ mode: "dry-run", app: { ...app, catalogPath: `/?app=${encodeURIComponent(app.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`, sharePath: `/api/share/apps/${encodeURIComponent(app.id)}`, comfyAppUrl } });
}
