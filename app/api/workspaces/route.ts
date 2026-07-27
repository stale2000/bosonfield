import { invalid, stableDryId } from "../_dry-data";

type Workspace = { id: string; name: string; kind: string; role: string; members: number };
type WorkspaceRuntime = typeof globalThis & { __bosonfieldWorkspaces?: Workspace[] };
const runtime = globalThis as WorkspaceRuntime;
const workspaces = runtime.__bosonfieldWorkspaces ?? (runtime.__bosonfieldWorkspaces = [{ id: "workspace_dry_personal", name: "Personal field", kind: "personal", role: "owner", members: 1 }, { id: "workspace_dry_studio", name: "Studio beta", kind: "team", role: "owner", members: 3 }]);

export function GET() {
  return Response.json({ workspaces, mode: "dry-run" });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  if (typeof body.name !== "string" || !body.name.trim()) return invalid("name is required");
  const workspace = { id: stableDryId("workspace", body.name), name: body.name.trim(), kind: "team", role: "owner", members: 1 };
  if (!workspaces.some((entry) => entry.id === workspace.id)) workspaces.push(workspace);
  return Response.json({ workspace, mode: "dry-run" }, { status: 201 });
}
