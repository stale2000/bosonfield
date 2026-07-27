type Privacy = { defaultProjectVisibility: string; allowPublicComments: boolean; allowDiscovery: boolean; retentionDays: number };
type PrivacyRuntime = typeof globalThis & { __bosonfieldPrivacy?: Privacy };
const runtime = globalThis as PrivacyRuntime;
const privacy = runtime.__bosonfieldPrivacy ?? (runtime.__bosonfieldPrivacy = { defaultProjectVisibility: "private", allowPublicComments: true, allowDiscovery: false, retentionDays: 30 });

export function GET() { return Response.json({ privacy, mode: "dry-run" }); }

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.defaultProjectVisibility !== undefined && !["private", "unlisted"].includes(String(body.defaultProjectVisibility))) return Response.json({ error: { code: "INPUT_INVALID", message: "defaultProjectVisibility must be private or unlisted" } }, { status: 400 });
  if (body.allowPublicComments !== undefined && typeof body.allowPublicComments !== "boolean") return Response.json({ error: { code: "INPUT_INVALID", message: "allowPublicComments must be boolean" } }, { status: 400 });
  if (body.allowDiscovery !== undefined && typeof body.allowDiscovery !== "boolean") return Response.json({ error: { code: "INPUT_INVALID", message: "allowDiscovery must be boolean" } }, { status: 400 });
  if (body.retentionDays !== undefined && (!Number.isInteger(body.retentionDays) || Number(body.retentionDays) < 1 || Number(body.retentionDays) > 3650)) return Response.json({ error: { code: "INPUT_INVALID", message: "retentionDays must be an integer from 1 to 3650" } }, { status: 400 });
  Object.assign(privacy, { defaultProjectVisibility: body.defaultProjectVisibility ?? privacy.defaultProjectVisibility, allowPublicComments: body.allowPublicComments ?? privacy.allowPublicComments, allowDiscovery: body.allowDiscovery ?? privacy.allowDiscovery, retentionDays: body.retentionDays ?? privacy.retentionDays });
  return Response.json({ privacy, mode: "dry-run" });
}
