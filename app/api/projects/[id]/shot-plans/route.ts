import { dryProjects } from "../../../_dry-data";

type ShotPlan = { id: string; title: string; status: string; shots: Array<{ id: string; order: number; brief: string; workflowId: string; estimatedCredits: number }> };
type PlansRuntime = typeof globalThis & { __bosonfieldShotPlans?: Map<string, ShotPlan[]> };
const runtime = globalThis as PlansRuntime;
const plans = runtime.__bosonfieldShotPlans ?? (runtime.__bosonfieldShotPlans = new Map<string, ShotPlan[]>([
  ["project_dry_01", [{ id: "plan_dry_01", title: "Opening sequence", status: "draft", shots: [{ id: "shot_dry_01", order: 0, brief: "A quiet machine wakes in a blue field.", workflowId: "video-i2v", estimatedCredits: 18 }] }]],
]));

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!dryProjects.some((project) => project.id === id)) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  return Response.json({ mode: "dry-run", projectId: id, plans: plans.get(id) ?? [] });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!dryProjects.some((project) => project.id === id)) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { id?: string; title?: string; brief?: string; shotCount?: number };
  const plan = (plans.get(id) ?? []).find((entry) => entry.id === body.id);
  if (!plan) return Response.json({ error: { code: "SHOT_PLAN_NOT_FOUND", message: "Shot plan not found" } }, { status: 404 });
  if (!body.title?.trim() || !body.brief?.trim()) return Response.json({ error: { code: "INPUT_INVALID", message: "title and brief are required" } }, { status: 400 });
  plan.title = body.title.trim();
  plan.shots[0] = { ...plan.shots[0], brief: body.brief.trim() };
  return Response.json({ mode: "dry-run", projectId: id, plan });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!dryProjects.some((project) => project.id === id)) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { title?: string; brief?: string; shotCount?: number };
  if (!body.title?.trim() || !body.brief?.trim()) return Response.json({ error: { code: "INPUT_INVALID", message: "title and brief are required" } }, { status: 400 });
  if (body.shotCount !== undefined && (!Number.isInteger(body.shotCount) || body.shotCount < 1)) return Response.json({ error: { code: "INPUT_INVALID", message: "shotCount must be a positive integer" } }, { status: 400 });
  const count = Math.min(Math.max(body.shotCount ?? 1, 1), 12);
  const plan = { id: `plan_dry_${Date.now()}`, title: body.title.trim(), status: "draft", shots: Array.from({ length: count }, (_, index) => ({ id: `shot_dry_${Date.now()}_${index}`, order: index, brief: index === 0 ? body.brief!.trim() : "Pending shot direction", workflowId: "video-i2v", estimatedCredits: 18 })) };
  plans.set(id, [...(plans.get(id) ?? []), plan]);
  return Response.json({ mode: "dry-run", projectId: id, plan }, { status: 201 });
}
