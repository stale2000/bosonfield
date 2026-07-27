type Profile = { displayName: string; bio: string; avatarAssetId: string | null; locale: string };
type ProfileRuntime = typeof globalThis & { __bosonfieldProfile?: Profile };
const runtime = globalThis as ProfileRuntime;
const profile = runtime.__bosonfieldProfile ?? (runtime.__bosonfieldProfile = { displayName: "Bosonfield Creator", bio: "Building strange worlds.", avatarAssetId: null, locale: "en-US" });

export function GET() { return Response.json({ profile, mode: "dry-run" }); }

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { displayName?: string; bio?: string; locale?: string };
  if (body.displayName !== undefined && (typeof body.displayName !== "string" || !body.displayName.trim())) return Response.json({ error: { code: "INPUT_INVALID", message: "displayName must be non-empty" } }, { status: 400 });
  Object.assign(profile, { displayName: body.displayName?.trim() ?? profile.displayName, bio: body.bio ?? profile.bio, locale: body.locale ?? profile.locale });
  return Response.json({ profile, mode: "dry-run" });
}
