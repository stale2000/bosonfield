import { appById } from "../../../../lib/apps";
import { isExternalComfyUrl } from "../../../../lib/external-links";
import { links } from "../route";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const app = appById(id);
  if (!app) return Response.json({ error: { code: "APP_NOT_FOUND", message: "Unknown app" } }, { status: 404 });
  const configuredUrl = links.get(app.id) ?? app.comfyAppUrl;
  return Response.json({ mode: "dry-run", app: { ...app, catalogPath: `/?app=${encodeURIComponent(app.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`, sharePath: `/api/share/apps/${encodeURIComponent(app.id)}`, comfyAppUrl: isExternalComfyUrl(configuredUrl) ? configuredUrl.trim() : null } });
}
