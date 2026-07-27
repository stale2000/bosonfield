import { dryProjects, invalid, stableDryId } from "../../../_dry-data";

type RouteContext = { params: Promise<{ id: string }> };
type Comment = { id: string; body: string; author: string; createdAt: string };
type CommentRuntime = typeof globalThis & { __bosonfieldComments?: Map<string, Comment[]> };
const runtime = globalThis as CommentRuntime;
const comments = runtime.__bosonfieldComments ?? (runtime.__bosonfieldComments = new Map([["project_dry_01", [{ id: "comment_dry_01", body: "A clean first pass.", author: "Bosonfield", createdAt: "2026-01-01T00:00:00.000Z" }]]]));

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!dryProjects.some((project) => project.id === id)) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  return Response.json({ comments: comments.get(id) ?? [], mode: "dry-run" });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!dryProjects.some((project) => project.id === id)) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { body?: string };
  if (typeof body.body !== "string" || !body.body.trim()) return invalid("body is required");
  const comment: Comment = { id: stableDryId("comment", body.body), body: body.body.trim(), author: "Bosonfield", createdAt: "2026-01-01T00:00:00.000Z" };
  const projectComments = comments.get(id) ?? [];
  if (!projectComments.some((entry) => entry.id === comment.id)) projectComments.push(comment);
  comments.set(id, projectComments);
  return Response.json({ comment, mode: "dry-run" }, { status: 201 });
}
