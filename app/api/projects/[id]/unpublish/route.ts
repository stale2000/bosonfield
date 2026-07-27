import { dryProjects } from "../../../_dry-data";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const project = dryProjects.find((entry) => entry.id === id);
  if (!project) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  project.visibility = "private";
  project.updatedAt = new Date().toISOString();
  return Response.json({ mode: "dry-run", projectId: id, visibility: "private", moderation: "removed-from-public-index" });
}
