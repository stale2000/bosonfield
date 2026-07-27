import { dryProjects } from "../../../_dry-data";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const project = dryProjects.find((entry) => entry.id === id);
  if (!project) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { visibility?: string };
  const visibility = body.visibility ?? "public";
  if (!['private', 'unlisted', 'public'].includes(visibility)) return Response.json({ error: { code: "INPUT_INVALID", message: "visibility must be private, unlisted, or public" } }, { status: 400 });
  project.visibility = visibility as typeof project.visibility;
  project.updatedAt = new Date().toISOString();
  return Response.json({ project: { ...project, visibility }, moderation: visibility === "public" ? "pending" : "not-required", mode: "dry-run" });
}
