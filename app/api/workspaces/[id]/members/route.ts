type WorkspaceMember = { id: string; email: string; role: "owner" | "admin" | "member" | "viewer"; status: "active" | "invited" };
type MemberRuntime = typeof globalThis & { __bosonfieldWorkspaceMembers?: Record<string, WorkspaceMember[]> };
const runtime = globalThis as MemberRuntime;
const membersByWorkspace = runtime.__bosonfieldWorkspaceMembers ?? (runtime.__bosonfieldWorkspaceMembers = {
  workspace_dry_personal: [{ id: "member_dry_owner", email: "creator@bosonfield.local", role: "owner", status: "active" }],
  workspace_dry_studio: [{ id: "member_dry_owner", email: "creator@bosonfield.local", role: "owner", status: "active" }, { id: "member_dry_collab", email: "collaborator@bosonfield.local", role: "member", status: "active" }, { id: "member_dry_review", email: "reviewer@bosonfield.local", role: "viewer", status: "active" }],
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return Response.json({ mode: "dry-run", workspaceId: id, members: membersByWorkspace[id] ?? [] });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { email?: string; role?: "admin" | "member" | "viewer" };
  const email = body.email?.trim().toLowerCase();
  const role = body.role;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !role || !["admin", "member", "viewer"].includes(role)) return Response.json({ error: { code: "INPUT_INVALID", message: "a valid email and role are required" } }, { status: 400 });
  if ((membersByWorkspace[id] ?? []).some((member) => member.email === email)) return Response.json({ error: { code: "MEMBER_EXISTS", message: "member already exists" } }, { status: 409 });
  const member = { id: `member_dry_${Date.now()}`, email, role, status: "invited" } as WorkspaceMember;
  (membersByWorkspace[id] ??= []).push(member);
  return Response.json({ mode: "dry-run", workspaceId: id, member }, { status: 201 });
}
