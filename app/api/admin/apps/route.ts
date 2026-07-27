import { allUsecaseApps, customApps, type UsecaseApp } from "../../../../lib/apps";
import { isExternalComfyUrl } from "../../../../lib/external-links";
import { showcaseLinks } from "../../../../lib/showcase-links";

function record(app: UsecaseApp) {
  const slug = app.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const configuredUrl = showcaseLinks("apps").get(app.id) ?? app.comfyAppUrl;
  return { ...app, catalogPath: `/?app=${encodeURIComponent(slug)}`, sharePath: `/api/share/apps/${encodeURIComponent(app.id)}`, comfyAppUrl: isExternalComfyUrl(configuredUrl) ? configuredUrl.trim() : null };
}

export function GET() { return Response.json({ mode: "dry-run", apps: customApps.map(record) }); }

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Partial<UsecaseApp> & { name?: string };
  const title = (body.title ?? body.name)?.trim();
  if (!title || !body.description?.trim() || !body.studio?.trim() || !body.group?.trim()) return Response.json({ error: { code: "INPUT_INVALID", message: "title, description, studio, and group are required" } }, { status: 400 });
  const comfyAppUrl = body.comfyAppUrl === undefined ? undefined : body.comfyAppUrl === null ? undefined : body.comfyAppUrl.trim();
  if (comfyAppUrl && !isExternalComfyUrl(comfyAppUrl)) return Response.json({ error: { code: "INPUT_INVALID", message: "comfyAppUrl must be a safe http(s) URL" } }, { status: 400 });
  const app: UsecaseApp = { id: `app_custom_${Date.now()}`, title, description: body.description.trim(), studio: body.studio.trim(), art: body.art?.trim() || "workflow", group: body.group.trim() };
  customApps.push(app);
  if (comfyAppUrl) showcaseLinks("apps").set(app.id, comfyAppUrl);
  return Response.json({ mode: "dry-run", app: record(app), count: allUsecaseApps().length }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({})) as Partial<UsecaseApp> & { appId?: string; comfyAppUrl?: string | null };
  const app = customApps.find((entry) => entry.id === body.appId);
  if (!app) return Response.json({ error: { code: "APP_NOT_FOUND", message: "Custom app not found" } }, { status: 404 });
  if (body.title !== undefined && !body.title.trim()) return Response.json({ error: { code: "INPUT_INVALID", message: "title cannot be empty" } }, { status: 400 });
  const nextUrl = body.comfyAppUrl === null ? null : body.comfyAppUrl === undefined ? undefined : body.comfyAppUrl.trim();
  if (nextUrl && !isExternalComfyUrl(nextUrl)) return Response.json({ error: { code: "INPUT_INVALID", message: "comfyAppUrl must be a safe http(s) URL" } }, { status: 400 });
  Object.assign(app, { title: body.title?.trim() || app.title, description: body.description?.trim() || app.description, studio: body.studio?.trim() || app.studio, art: body.art?.trim() || app.art, group: body.group?.trim() || app.group });
  if (nextUrl === null) showcaseLinks("apps").delete(app.id);
  if (nextUrl) showcaseLinks("apps").set(app.id, nextUrl);
  return Response.json({ mode: "dry-run", app: record(app) });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const index = customApps.findIndex((entry) => entry.id === id);
  if (index < 0) return Response.json({ error: { code: "APP_NOT_FOUND", message: "Custom app not found" } }, { status: 404 });
  const [deleted] = customApps.splice(index, 1);
  showcaseLinks("apps").delete(id!);
  return Response.json({ mode: "dry-run", deleted: deleted.id });
}
