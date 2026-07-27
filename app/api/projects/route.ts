import { dryProjects, invalid, stableDryId, type DryProject } from "../_dry-data";

type ProjectRequest = { name?: string; brief?: string; idempotencyKey?: string };

export function GET(request: Request) {
  const url = new URL(request.url);
  const visibility = url.searchParams.get("visibility");
  const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const limitValue = Number(url.searchParams.get("limit") ?? "12");
  const cursorValue = Number(url.searchParams.get("cursor") ?? "0");
  const limit = Number.isFinite(limitValue) ? Math.min(24, Math.max(1, Math.floor(limitValue))) : 12;
  const cursor = Number.isFinite(cursorValue) ? Math.max(0, Math.floor(cursorValue)) : 0;
  const filtered = dryProjects.filter((project) => (!visibility || project.visibility === visibility) && (!query || `${project.name} ${project.brief}`.toLowerCase().includes(query)));
  const projects = filtered.slice(cursor, cursor + limit);
  const nextCursor = cursor + projects.length < filtered.length ? String(cursor + projects.length) : null;
  return Response.json({ projects, nextCursor, mode: "dry-run" });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ProjectRequest;
  if (typeof body.name !== "string" || !body.name.trim()) return invalid("name is required");
  if (body.brief !== undefined && typeof body.brief !== "string") return invalid("brief must be a string");
  if (body.idempotencyKey !== undefined && (typeof body.idempotencyKey !== "string" || body.idempotencyKey.length > 128)) return invalid("idempotencyKey must be at most 128 characters");
  const id = stableDryId("project", body.idempotencyKey ?? body.name);
  const existing = dryProjects.find((entry) => entry.id === id);
  if (existing) return Response.json({ project: existing, mode: "dry-run" }, { status: 201 });
  const project: DryProject = { id, name: body.name.trim(), brief: body.brief ?? "", status: "draft", visibility: "private", scenes: [], assetIds: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
  dryProjects.push(project);
  return Response.json({ project, mode: "dry-run" }, { status: 201 });
}
