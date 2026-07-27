type SessionRuntime = typeof globalThis & { __bosonfieldSession?: boolean };
const runtime = globalThis as SessionRuntime;
runtime.__bosonfieldSession ??= true;

export function GET() {
  const authenticated = runtime.__bosonfieldSession === true;
  return Response.json({ authenticated, mode: "dry-run", user: authenticated ? { id: "user_dry_01", displayName: "Bosonfield Creator", email: "creator@dry.invalid" } : null, workspaceId: authenticated ? "workspace_dry_personal" : null });
}

export function DELETE() {
  runtime.__bosonfieldSession = false;
  return Response.json({ authenticated: false, mode: "dry-run" });
}

export function POST() {
  runtime.__bosonfieldSession = true;
  return GET();
}
