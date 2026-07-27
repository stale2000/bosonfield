import { invalid, stableDryId } from "../_dry-data";

export type DryDesign = {
  id: string;
  name: string;
  brief: string;
  audience: string;
  format: string;
  mood: string;
  beats: string[];
  status: "draft" | "review";
  createdAt: string;
  updatedAt: string;
};

type DesignRuntime = typeof globalThis & { __bosonfieldDesigns?: DryDesign[] };
const runtime = globalThis as DesignRuntime;
const designs = runtime.__bosonfieldDesigns ?? (runtime.__bosonfieldDesigns = [{
  id: "design_dry_field",
  name: "Untitled visual system",
  brief: "",
  audience: "Independent creators",
  format: "Campaign key art",
  mood: "Quiet intensity",
  beats: ["Opening image", "Human detail", "Final reveal"],
  status: "draft",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}]);

function required(value: unknown, field: string, max = 240) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(`${field} must be a non-empty string of at most ${max} characters`);
  return value.trim();
}
function beats(value: unknown, requiredBeats = true) {
  if (value === undefined && !requiredBeats) return undefined;
  if (!Array.isArray(value) || value.length > 24 || value.some((item) => typeof item !== "string" || !item.trim() || item.length > 240)) throw new Error("beats must contain at most 24 non-empty strings");
  return value.map((item) => item.trim());
}

export function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ mode: "dry-run", designs });
  const design = designs.find((item) => item.id === id);
  if (!design) return Response.json({ error: { code: "DESIGN_NOT_FOUND", message: "Design not found" } }, { status: 404 });
  return Response.json({ mode: "dry-run", design });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  try {
    const name = required(body.name ?? "Untitled visual system", "name");
    const design: DryDesign = { id: stableDryId("design", typeof body.idempotencyKey === "string" ? body.idempotencyKey : `${name}:${body.brief ?? ""}`), name, brief: required(body.brief, "brief", 6000), audience: required(body.audience ?? "Independent creators", "audience"), format: required(body.format ?? "Campaign key art", "format"), mood: required(body.mood ?? "Quiet intensity", "mood"), beats: beats(body.beats ?? ["Opening image", "Human detail", "Final reveal"])!, status: "draft", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const existing = designs.find((item) => item.id === design.id);
    if (existing) return Response.json({ mode: "dry-run", design: existing });
    designs.push(design);
    return Response.json({ mode: "dry-run", design }, { status: 201 });
  } catch (error) { return invalid(error instanceof Error ? error.message : "invalid design"); }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (typeof body.id !== "string" || !body.id.trim()) return invalid("id is required");
  const design = designs.find((item) => item.id === body.id);
  if (!design) return Response.json({ error: { code: "DESIGN_NOT_FOUND", message: "Design not found" } }, { status: 404 });
  try {
    for (const field of ["name", "brief", "audience", "format", "mood"] as const) if (body[field] !== undefined) design[field] = required(body[field], field, field === "brief" ? 6000 : undefined);
    const nextBeats = beats(body.beats, false);
    if (nextBeats !== undefined) design.beats = nextBeats;
    if (body.status !== undefined) { if (body.status !== "draft" && body.status !== "review") throw new Error("status must be draft or review"); design.status = body.status; }
    design.updatedAt = new Date().toISOString();
    return Response.json({ mode: "dry-run", design });
  } catch (error) { return invalid(error instanceof Error ? error.message : "invalid design"); }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const index = id ? designs.findIndex((item) => item.id === id) : -1;
  if (index < 0) return Response.json({ error: { code: "DESIGN_NOT_FOUND", message: "Design not found" } }, { status: 404 });
  const [design] = designs.splice(index, 1);
  return Response.json({ deleted: design.id, mode: "dry-run" });
}
