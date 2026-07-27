type Campaign = { id: string; name: string; productTitle: string; format: string; status: string; shotCount: number; sourceUrl?: string | null; productImages: string[]; hook?: string | null; avatar: string; referenceAd?: string | null; variants: number; assetIds: string[] };
type CampaignRuntime = typeof globalThis & { __bosonfieldCampaigns?: Campaign[] };
const runtime = globalThis as CampaignRuntime;
const campaigns = runtime.__bosonfieldCampaigns ?? (runtime.__bosonfieldCampaigns = [{ id: "campaign_dry_01", name: "Quiet machine launch", productTitle: "Field device", format: "product-demo", status: "draft", shotCount: 4, productImages: [], avatar: "No presenter", variants: 1, assetIds: [] }]);

export async function GET() { return Response.json({ mode: "dry-run", campaigns }); }

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { name?: string; productTitle?: string; format?: string; assetIds?: string[]; sourceUrl?: string; productImages?: string[]; hook?: string; avatar?: string; referenceAd?: string; variants?: number; idempotencyKey?: string };
  if (!body.name?.trim() || !body.productTitle?.trim() || !body.format?.trim()) return Response.json({ error: { code: "INPUT_INVALID", message: "name, productTitle, and format are required" } }, { status: 400 });
  const existing = body.idempotencyKey ? campaigns.find((campaign) => campaign.id === `campaign_dry_${body.idempotencyKey}`) : undefined;
  if (existing) return Response.json({ mode: "dry-run", campaign: existing }, { status: 200 });
  const campaign: Campaign = { id: `campaign_dry_${body.idempotencyKey ?? Date.now()}`, name: body.name.trim(), productTitle: body.productTitle.trim(), format: body.format.trim(), sourceUrl: body.sourceUrl ?? null, productImages: (body.productImages ?? []).slice(0, 5), hook: body.hook ?? null, avatar: body.avatar ?? "No presenter", referenceAd: body.referenceAd ?? null, variants: Math.min(Math.max(body.variants ?? 1, 1), 5), assetIds: body.assetIds ?? [], status: "draft", shotCount: 0 };
  campaigns.push(campaign);
  return Response.json({ mode: "dry-run", campaign }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { id?: string; name?: string; productTitle?: string; format?: string; sourceUrl?: string | null; productImages?: string[]; hook?: string | null; avatar?: string; referenceAd?: string | null; variants?: number };
  const campaign = body.id ? campaigns.find((entry) => entry.id === body.id) : undefined;
  if (!campaign) return Response.json({ error: { code: "CAMPAIGN_NOT_FOUND", message: "Campaign not found" } }, { status: 404 });
  if (body.name !== undefined && !body.name.trim() || body.productTitle !== undefined && !body.productTitle.trim() || body.format !== undefined && !body.format.trim()) return Response.json({ error: { code: "INPUT_INVALID", message: "name, productTitle, and format cannot be empty" } }, { status: 400 });
  if (body.name !== undefined) campaign.name = body.name.trim();
  if (body.productTitle !== undefined) campaign.productTitle = body.productTitle.trim();
  if (body.format !== undefined) campaign.format = body.format.trim();
  if (body.sourceUrl !== undefined) campaign.sourceUrl = body.sourceUrl;
  if (body.productImages !== undefined) campaign.productImages = body.productImages.slice(0, 5);
  if (body.hook !== undefined) campaign.hook = body.hook;
  if (body.avatar !== undefined) campaign.avatar = body.avatar;
  if (body.referenceAd !== undefined) campaign.referenceAd = body.referenceAd;
  if (body.variants !== undefined) campaign.variants = Math.min(Math.max(body.variants, 1), 5);
  return Response.json({ mode: "dry-run", campaign });
}
