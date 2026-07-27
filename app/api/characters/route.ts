type Character = { id: string; name: string; consentStatus: string; assetIds: string[]; status: string; consentRecordId?: string };
type CharacterRuntime = typeof globalThis & { __bosonfieldCharacters?: Character[] };
const runtime = globalThis as CharacterRuntime;
const characters = runtime.__bosonfieldCharacters ?? (runtime.__bosonfieldCharacters = [{ id: "character_dry_01", name: "Reference set 01", consentStatus: "pending", assetIds: ["asset_dry_image_01"], status: "draft" }]);

export async function GET() { return Response.json({ mode: "dry-run", characters }); }

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { name?: string; assetIds?: string[]; consentRecordId?: string };
  if (!body.name?.trim() || !body.assetIds?.length || !body.consentRecordId?.trim()) return Response.json({ error: { code: "CONSENT_REQUIRED", message: "name, at least one assetId, and consentRecordId are required" } }, { status: 400 });
  const character: Character = { id: `character_dry_${Date.now()}`, name: body.name.trim(), assetIds: body.assetIds, consentStatus: "recorded", consentRecordId: body.consentRecordId, status: "draft" };
  characters.push(character);
  return Response.json({ mode: "dry-run", character }, { status: 201 });
}
