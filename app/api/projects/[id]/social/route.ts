import { dryProjects, invalid } from "../../../_dry-data";

type RouteContext = { params: Promise<{ id: string }> };
type SocialState = { following: boolean; liked: boolean; followers: number; likes: number };
type SocialRuntime = typeof globalThis & { __bosonfieldProjectSocial?: Map<string, SocialState> };
const runtime = globalThis as SocialRuntime;
const social = runtime.__bosonfieldProjectSocial ?? (runtime.__bosonfieldProjectSocial = new Map());

function stateFor(id: string) {
  const existing = social.get(id);
  if (existing) return existing;
  const state = { following: false, liked: false, followers: 0, likes: 0 };
  social.set(id, state);
  return state;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!dryProjects.some((project) => project.id === id)) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  return Response.json({ social: stateFor(id), mode: "dry-run" });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!dryProjects.some((project) => project.id === id)) return Response.json({ error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${id}` } }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { action?: string; active?: boolean };
  if (body.action !== "follow" && body.action !== "like") return invalid("action must be follow or like");
  if (typeof body.active !== "boolean") return invalid("active must be a boolean");
  const state = stateFor(id);
  const key = body.action === "follow" ? "following" : "liked";
  const count = body.action === "follow" ? "followers" : "likes";
  if (state[key] !== body.active) state[count] += body.active ? 1 : -1;
  state[key] = body.active;
  return Response.json({ social: state, mode: "dry-run" });
}
