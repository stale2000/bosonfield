import catalog from "../../../../workflows/manifests/catalog.json";

type WorkflowRuntime = typeof globalThis & { __bosonfieldWorkflowReviews?: Map<string, "verified" | "retired"> };
const runtime = globalThis as WorkflowRuntime;
const reviews = runtime.__bosonfieldWorkflowReviews ?? (runtime.__bosonfieldWorkflowReviews = new Map());

export async function GET() {
  return Response.json({ mode: "dry-run", workflows: catalog.map((workflow) => ({ ...workflow, status: reviews.get(workflow.id) ?? workflow.status, review: (reviews.get(workflow.id) ?? workflow.status) === "verified" ? "approved" : "needs-review" })) });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { workflowId?: string; action?: "verify" | "retire" };
  const workflow = catalog.find((item) => item.id === body.workflowId);
  if (!workflow || !["verify", "retire"].includes(body.action ?? "")) return Response.json({ error: { code: "INPUT_INVALID", message: "workflowId and action are required" } }, { status: 400 });
  const status = body.action === "verify" ? "verified" : "retired";
  reviews.set(workflow.id, status);
  return Response.json({ mode: "dry-run", workflowId: workflow.id, action: body.action, status });
}
