import { dryProjects, invalid } from "../../_dry-data";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const project = dryProjects.find((entry) => entry.id === id);
  if (!project) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  return Response.json({ project, mode: "dry-run" });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const project = dryProjects.find((entry) => entry.id === id);
  if (!project) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { name?: string; brief?: string };
  if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) return invalid("name must be a non-empty string");
  if (body.brief !== undefined && typeof body.brief !== "string") return invalid("brief must be a string");
  if (body.name !== undefined) project.name = body.name.trim();
  if (body.brief !== undefined) project.brief = body.brief;
  project.updatedAt = new Date().toISOString();
  return Response.json({ project, mode: "dry-run" });
}
